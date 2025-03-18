from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import firestore
from app.routers.auth import verify_token

router = APIRouter()

# Pydantic models
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class Expense(ExpenseCreate):
    id: str
    user_id: str

class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str = "monthly"  # monthly, weekly, yearly
    description: Optional[str] = None

class Budget(BudgetCreate):
    id: str
    user_id: str

class DebtCreate(BaseModel):
    name: str
    type: str  # credit_card, loan, student_loan, mortgage, other
    total_amount: float
    remaining_amount: float
    interest_rate: float
    minimum_payment: float
    due_date: Optional[str] = None  # YYYY-MM-DD
    notes: Optional[str] = None

class Debt(DebtCreate):
    id: str
    user_id: str

class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    target_date: Optional[str] = None  # YYYY-MM-DD
    category: Optional[str] = None  # retirement, emergency, house, car, etc.
    notes: Optional[str] = None

class SavingsGoal(SavingsGoalCreate):
    id: str
    user_id: str
    created_at: str

class InvestmentPlanCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    monthly_contribution: float
    asset_allocation: Dict[str, float]  # e.g., {"stocks": 60, "bonds": 30, "cash": 10}
    risk_profile: str  # conservative, moderate, aggressive
    time_horizon: int  # years
    notes: Optional[str] = None

class InvestmentPlan(InvestmentPlanCreate):
    id: str
    user_id: str
    created_at: str

# Get Firestore DB instance (would normally be initialized in a config module)
# db = firestore.client()

# Helper function to simulate Firestore operations (for development/testing)
def mock_collection(collection_name):
    """Mock Firestore collection operations"""
    
    # This is a simplified in-memory store for development
    # In production, this would use actual Firestore calls
    mock_data = {
        "budgets": [
            {
                "id": "budget1",
                "user_id": "user123",
                "category": "Food",
                "amount": 500.0,
                "period": "monthly",
                "description": "Grocery and dining"
            },
            {
                "id": "budget2",
                "user_id": "user123",
                "category": "Housing",
                "amount": 1500.0,
                "period": "monthly",
                "description": "Rent and utilities"
            }
        ],
        "expenses": [
            {
                "id": "exp1",
                "user_id": "user123",
                "amount": 45.75,
                "category": "Food",
                "description": "Grocery shopping",
                "date": "2025-03-15"
            },
            {
                "id": "exp2",
                "user_id": "user123",
                "amount": 12.99,
                "category": "Entertainment",
                "description": "Movie streaming",
                "date": "2025-03-14"
            }
        ],
        "debts": [
            {
                "id": "debt1",
                "user_id": "user123",
                "name": "Credit Card A",
                "type": "credit_card",
                "total_amount": 2500.0,
                "remaining_amount": 1800.0,
                "interest_rate": 18.99,
                "minimum_payment": 35.0,
                "due_date": "2025-04-15"
            }
        ],
        "savings_goals": [
            {
                "id": "goal1",
                "user_id": "user123",
                "name": "Emergency Fund",
                "target_amount": 10000.0,
                "current_amount": 2500.0,
                "category": "emergency",
                "created_at": "2025-01-10"
            }
        ],
        "investment_plans": [
            {
                "id": "inv1",
                "user_id": "user123",
                "name": "Retirement Plan",
                "target_amount": 500000.0,
                "current_amount": 25000.0,
                "monthly_contribution": 500.0,
                "asset_allocation": {"stocks": 70, "bonds": 25, "cash": 5},
                "risk_profile": "moderate",
                "time_horizon": 30,
                "created_at": "2025-01-15"
            }
        ]
    }
    
    class MockCollection:
        def __init__(self, collection_name):
            self.collection_name = collection_name
            self.data = mock_data.get(collection_name, [])
        
        def where(self, field, op, value):
            if op == "==":
                self.data = [item for item in self.data if item.get(field) == value]
            return self
        
        def stream(self):
            class MockDoc:
                def __init__(self, doc_data):
                    self.doc_data = doc_data
                
                def to_dict(self):
                    return self.doc_data
                
                def id(self):
                    return self.doc_data.get("id")
            
            return [MockDoc(item) for item in self.data]
        
        def document(self, doc_id=None):
            class MockDoc:
                def __init__(self, doc_id, collection_data):
                    self.doc_id = doc_id
                    self.collection_data = collection_data
                
                def get(self):
                    for item in self.collection_data:
                        if item.get("id") == self.doc_id:
                            return type('obj', (object,), {
                                'to_dict': lambda: item,
                                'exists': True
                            })
                    return type('obj', (object,), {'exists': False})
                
                def set(self, data):
                    # Simulate adding or updating a document
                    existing = None
                    for i, item in enumerate(self.collection_data):
                        if item.get("id") == self.doc_id:
                            existing = i
                            break
                    
                    if existing is not None:
                        self.collection_data[existing].update(data)
                    else:
                        new_data = {"id": self.doc_id}
                        new_data.update(data)
                        self.collection_data.append(new_data)
                
                def delete(self):
                    # Simulate deleting a document
                    for i, item in enumerate(self.collection_data):
                        if item.get("id") == self.doc_id:
                            del self.collection_data[i]
                            break
            
            return MockDoc(doc_id, self.data)
    
    return MockCollection(collection_name)

# Endpoints for Budget
@router.post("/budgets", response_model=Budget, status_code=201)
async def create_budget(
    budget: BudgetCreate, 
    user_data = Depends(verify_token)
):
    """Create a new budget category for the user"""
    user_id = user_data.get("uid")
    
    # In production, this would use Firestore
    # budget_ref = db.collection("budgets").document()
    # budget_id = budget_ref.id
    
    # For development, using a mock implementation
    import uuid
    budget_id = str(uuid.uuid4())
    
    budget_data = budget.dict()
    budget_data.update({"user_id": user_id, "id": budget_id})
    
    # budget_ref.set(budget_data)
    
    return budget_data

@router.get("/budgets", response_model=List[Budget])
async def get_budgets(user_data = Depends(verify_token)):
    """Get all budget categories for the current user"""
    user_id = user_data.get("uid")
    
    # In production:
    # budget_refs = db.collection("budgets").where("user_id", "==", user_id).stream()
    # budgets = [doc.to_dict() for doc in budget_refs]
    
    # For development, using mock data
    budgets = [
        {
            "id": "budget1",
            "user_id": user_id,
            "category": "Food",
            "amount": 500.0,
            "period": "monthly",
            "description": "Grocery and dining"
        },
        {
            "id": "budget2",
            "user_id": user_id,
            "category": "Housing",
            "amount": 1500.0,
            "period": "monthly",
            "description": "Rent and utilities"
        },
        {
            "id": "budget3",
            "user_id": user_id,
            "category": "Entertainment",
            "amount": 200.0,
            "period": "monthly",
            "description": "Movies, games, etc."
        }
    ]
    
    return budgets

# Endpoints for Expenses
@router.post("/expenses", response_model=Expense, status_code=201)
async def create_expense(
    expense: ExpenseCreate, 
    user_data = Depends(verify_token)
):
    """Record a new expense"""
    user_id = user_data.get("uid")
    
    # In production, this would use Firestore
    import uuid
    expense_id = str(uuid.uuid4())
    
    expense_data = expense.dict()
    expense_data.update({"user_id": user_id, "id": expense_id})
    
    return expense_data

@router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    user_data = Depends(verify_token)
):
    """Get expenses with optional filters"""
    user_id = user_data.get("uid")
    
    # Mock data for development
    expenses = [
        {
            "id": "exp1",
            "user_id": user_id,
            "amount": 45.75,
            "category": "Food",
            "description": "Grocery shopping",
            "date": "2025-03-15"
        },
        {
            "id": "exp2",
            "user_id": user_id,
            "amount": 12.99,
            "category": "Entertainment",
            "description": "Movie streaming",
            "date": "2025-03-14"
        },
        {
            "id": "exp3",
            "user_id": user_id,
            "amount": 150.00,
            "category": "Housing",
            "description": "Electricity bill",
            "date": "2025-03-10"
        }
    ]
    
    # Apply filters (in production would be part of the Firestore query)
    if category:
        expenses = [e for e in expenses if e["category"] == category]
    
    if start_date:
        expenses = [e for e in expenses if e["date"] >= start_date]
    
    if end_date:
        expenses = [e for e in expenses if e["date"] <= end_date]
    
    return expenses

# Endpoints for Debt
@router.post("/debts", response_model=Debt, status_code=201)
async def create_debt(
    debt: DebtCreate, 
    user_data = Depends(verify_token)
):
    """Add a new debt to track"""
    user_id = user_data.get("uid")
    
    import uuid
    debt_id = str(uuid.uuid4())
    
    debt_data = debt.dict()
    debt_data.update({"user_id": user_id, "id": debt_id})
    
    return debt_data

@router.get("/debts", response_model=List[Debt])
async def get_debts(user_data = Depends(verify_token)):
    """Get all debts for the current user"""
    user_id = user_data.get("uid")
    
    # Mock data for development
    debts = [
        {
            "id": "debt1",
            "user_id": user_id,
            "name": "Credit Card A",
            "type": "credit_card",
            "total_amount": 2500.0,
            "remaining_amount": 1800.0,
            "interest_rate": 18.99,
            "minimum_payment": 35.0,
            "due_date": "2025-04-15",
            "notes": None
        },
        {
            "id": "debt2",
            "user_id": user_id,
            "name": "Student Loan",
            "type": "student_loan",
            "total_amount": 15000.0,
            "remaining_amount": 10000.0,
            "interest_rate": 4.5,
            "minimum_payment": 150.0,
            "due_date": "2025-04-01",
            "notes": "Federal student loan"
        }
    ]
    
    return debts

# Endpoints for Savings Goals
@router.post("/savings-goals", response_model=SavingsGoal, status_code=201)
async def create_savings_goal(
    goal: SavingsGoalCreate, 
    user_data = Depends(verify_token)
):
    """Create a new savings goal"""
    user_id = user_data.get("uid")
    
    import uuid
    goal_id = str(uuid.uuid4())
    created_at = datetime.now().strftime("%Y-%m-%d")
    
    goal_data = goal.dict()
    goal_data.update({
        "user_id": user_id, 
        "id": goal_id,
        "created_at": created_at
    })
    
    return goal_data

@router.get("/savings-goals", response_model=List[SavingsGoal])
async def get_savings_goals(user_data = Depends(verify_token)):
    """Get all savings goals for the current user"""
    user_id = user_data.get("uid")
    
    # Mock data for development
    goals = [
        {
            "id": "goal1",
            "user_id": user_id,
            "name": "Emergency Fund",
            "target_amount": 10000.0,
            "current_amount": 2500.0,
            "target_date": "2025-12-31",
            "category": "emergency",
            "notes": "3 months of expenses",
            "created_at": "2025-01-10"
        },
        {
            "id": "goal2",
            "user_id": user_id,
            "name": "Vacation",
            "target_amount": 3000.0,
            "current_amount": 1000.0,
            "target_date": "2025-08-01",
            "category": "travel",
            "notes": "Summer trip to Europe",
            "created_at": "2025-02-15"
        }
    ]
    
    return goals

# Endpoints for Investment Plans
@router.post("/investment-plans", response_model=InvestmentPlan, status_code=201)
async def create_investment_plan(
    plan: InvestmentPlanCreate, 
    user_data = Depends(verify_token)
):
    """Create a new investment plan"""
    user_id = user_data.get("uid")
    
    import uuid
    plan_id = str(uuid.uuid4())
    created_at = datetime.now().strftime("%Y-%m-%d")
    
    plan_data = plan.dict()
    plan_data.update({
        "user_id": user_id, 
        "id": plan_id,
        "created_at": created_at
    })
    
    return plan_data

@router.get("/investment-plans", response_model=List[InvestmentPlan])
async def get_investment_plans(user_data = Depends(verify_token)):
    """Get all investment plans for the current user"""
    user_id = user_data.get("uid")
    
    # Mock data for development
    plans = [
        {
            "id": "inv1",
            "user_id": user_id,
            "name": "Retirement Plan",
            "target_amount": 500000.0,
            "current_amount": 25000.0,
            "monthly_contribution": 500.0,
            "asset_allocation": {"stocks": 70, "bonds": 25, "cash": 5},
            "risk_profile": "moderate",
            "time_horizon": 30,
            "notes": "401(k) account",
            "created_at": "2025-01-15"
        },
        {
            "id": "inv2",
            "user_id": user_id,
            "name": "House Down Payment",
            "target_amount": 50000.0,
            "current_amount": 15000.0,
            "monthly_contribution": 750.0,
            "asset_allocation": {"stocks": 30, "bonds": 50, "cash": 20},
            "risk_profile": "conservative",
            "time_horizon": 5,
            "notes": "Saving for first home",
            "created_at": "2025-02-01"
        }
    ]
    
    return plans

@router.get("/dashboard-summary")
async def get_dashboard_summary(user_data = Depends(verify_token)):
    """Get a summary of all financial data for the dashboard"""
    user_id = user_data.get("uid")
    
    # This would pull data from Firestore in production
    # For now, returning mock data
    
    # Calculate budget vs spending
    budget_vs_spending = [
        {"category": "Food", "budget": 500.0, "spent": 325.75},
        {"category": "Housing", "budget": 1500.0, "spent": 1450.0},
        {"category": "Entertainment", "budget": 200.0, "spent": 87.50},
        {"category": "Transportation", "budget": 300.0, "spent": 215.30},
        {"category": "Utilities", "budget": 250.0, "spent": 237.45}
    ]
    
    # Monthly expense trend
    expense_trend = [
        {"month": "Jan", "amount": 2650.25},
        {"month": "Feb", "amount": 2720.15},
        {"month": "Mar", "amount": 2315.80}
    ]
    
    # Debt summary
    total_debt = 11800.0
    debt_breakdown = [
        {"type": "Credit Card", "amount": 1800.0, "percentage": 15.25},
        {"type": "Student Loan", "amount": 10000.0, "percentage": 84.75}
    ]
    
    # Savings goals progress
    savings_progress = [
        {"name": "Emergency Fund", "current": 2500.0, "target": 10000.0, "percentage": 25},
        {"name": "Vacation", "current": 1000.0, "target": 3000.0, "percentage": 33.33}
    ]
    
    # Investment summary
    investments_total = 40000.0
    investment_allocation = [
        {"category": "Stocks", "amount": 26000.0, "percentage": 65},
        {"category": "Bonds", "amount": 10000.0, "percentage": 25},
        {"category": "Cash", "amount": 4000.0, "percentage": 10}
    ]
    
    return {
        "total_budget": 2750.0,
        "total_expenses_this_month": 2315.80,
        "budget_vs_spending": budget_vs_spending,
        "expense_trend": expense_trend,
        "total_debt": total_debt,
        "debt_breakdown": debt_breakdown,
        "savings_progress": savings_progress,
        "investments_total": investments_total,
        "investment_allocation": investment_allocation
    }

@router.get("/debt-payoff-strategy/{debt_id}")
async def get_debt_payoff_strategy(
    debt_id: str,
    additional_payment: float = 0,
    user_data = Depends(verify_token)
):
    """Calculate debt payoff strategy (snowball or avalanche)"""
    user_id = user_data.get("uid")
    
    # This would fetch the actual debt from Firestore in production
    # For now, using mock data
    debt = {
        "id": debt_id,
        "user_id": user_id,
        "name": "Credit Card A",
        "type": "credit_card",
        "total_amount": 2500.0,
        "remaining_amount": 1800.0,
        "interest_rate": 18.99,
        "minimum_payment": 35.0,
        "due_date": "2025-04-15"
    }
    
    # Calculate minimum payment strategy
    min_payment_months = 0
    min_payment_interest = 0
    remaining = debt["remaining_amount"]
    monthly_rate = debt["interest_rate"] / 100 / 12
    
    while remaining > 0:
        interest = remaining * monthly_rate
        principal = debt["minimum_payment"] - interest
        remaining -= principal
        min_payment_interest += interest
        min_payment_months += 1
    
    # Calculate with additional payment
    accel_payment_months = 0
    accel_payment_interest = 0
    remaining = debt["remaining_amount"]
    total_payment = debt["minimum_payment"] + additional_payment
    
    while remaining > 0:
        interest = remaining * monthly_rate
        principal = total_payment - interest
        remaining -= principal
        accel_payment_interest += interest
        accel_payment_months += 1
    
    # Calculate savings
    months_saved = min_payment_months - accel_payment_months
    interest_saved = min_payment_interest - accel_payment_interest
    
    return {
        "debt": debt,
        "minimum_payment_strategy": {
            "months_to_payoff": min_payment_months,
            "total_interest_paid": round(min_payment_interest, 2),
            "payoff_date": (datetime.now() + timedelta(days=30 * min_payment_months)).strftime("%Y-%m")
        },
        "accelerated_payment_strategy": {
            "additional_monthly_payment": additional_payment,
            "months_to_payoff": accel_payment_months,
            "total_interest_paid": round(accel_payment_interest, 2),
            "payoff_date": (datetime.now() + timedelta(days=30 * accel_payment_months)).strftime("%Y-%m")
        },
        "savings": {
            "months_saved": months_saved,
            "interest_saved": round(interest_saved, 2)
        }
    }
