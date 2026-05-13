from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Iterable
from dataclasses import dataclass
from collections import defaultdict, Counter
from itertools import combinations
from datetime import datetime

@dataclass(frozen=True)
class RecommendationConfig:
    top_n: int = 5
    history_category_boost: float = 0.15
    cross_sell_boost: float = 0.20
    enable_cross_sell: bool = True

@dataclass
class RFMConfig:
    as_of: Optional[pd.Timestamp] = None
    output_csv_path: Optional[str] = None
    customer_col: str = "customer_id"
    order_col: str = "order_id"
    date_col: str = "order_date"
    amount_col: str = "amount"

@dataclass(frozen=True)
class PipelineArtifacts:
    transactions: pd.DataFrame
    rfm: pd.DataFrame
    segment_stats: pd.DataFrame
    segment_top_products: Dict[str, pd.DataFrame]
    segment_top_categories: Dict[str, pd.DataFrame]
    cooccurrence: Dict[str, List[Tuple[str, int]]]

class DataValidationError(ValueError):
    pass

# --- COLUMN HELPERS ---
ESSENTIAL_COLUMNS = ["CustomerID", "InvoiceNo", "InvoiceDate", "TotalPrice"]
METADATA_COLUMNS = ["CustomerName", "CustomerEmail", "StockCode", "Description", "Quantity", "UnitPrice", "OrderStatus", "Location", "PhoneNumber"]
REQUIRED_COLUMNS = ESSENTIAL_COLUMNS + METADATA_COLUMNS

_COLUMN_KEYWORDS = {
    "CustomerID": ["customer_id", "cust_id", "client_id", "user_id"],
    "CustomerName": ["customer", "name", "client", "customer_name", "full_name"],
    "CustomerEmail": ["email", "email_address", "contact_email"],
    "InvoiceNo": ["invoice", "order", "bill", "receipt", "txn", "transaction", "id"],
    "InvoiceDate": ["orderdate", "date", "transaction_date", "timestamp", "invoice_date"],
    "TotalPrice": ["amount", "total", "price", "sum", "value", "revenue"],
    "StockCode": ["sku", "stock", "product_id", "item_code", "code"],
    "Description": ["product_name", "description", "product", "item", "name", "title"],
    "Quantity": ["quantity", "qty", "ordered_items", "count", "number_of_ordered_items"],
    "UnitPrice": ["price", "unit_price", "product_price", "rate", "unitprice"],
    "OrderStatus": ["status", "order_status"],
    "Location": ["location", "city", "state", "country"],
    "PhoneNumber": ["phone", "mobile", "contact", "phone_number"],
}

def infer_column_mapping(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    cols = [str(c) for c in df.columns]
    lower = {c: c.lower().replace(" ", "").replace("-", "").replace("_", "") for c in cols}
    mapping = {k: None for k in REQUIRED_COLUMNS}
    for internal, keywords in _COLUMN_KEYWORDS.items():
        for col, norm in lower.items():
            if any(kw in norm for kw in keywords):
                mapping[internal] = col
                break
        if mapping[internal] is None and internal in df.columns:
            mapping[internal] = internal
    return mapping

def apply_column_mapping(df: pd.DataFrame, mapping: Optional[Dict[str, Optional[str]]] = None) -> pd.DataFrame:
    if mapping is None:
        mapping = infer_column_mapping(df)
    
    rename_map = {}
    missing_essential = []
    
    # Check essential columns
    for col in ESSENTIAL_COLUMNS:
        raw_name = mapping.get(col)
        if raw_name and raw_name in df.columns:
            rename_map[raw_name] = col
        else:
            # Fallback for CustomerID: use CustomerName if missing
            if col == "CustomerID" and mapping.get("CustomerName") and mapping.get("CustomerName") in df.columns:
                rename_map[mapping.get("CustomerName")] = "CustomerID"
            else:
                missing_essential.append(col)
            
    if missing_essential:
        # Special case: if TotalPrice is missing but Quantity/UnitPrice are available
        if "TotalPrice" in missing_essential and mapping.get("Quantity") and mapping.get("UnitPrice"):
            missing_essential.remove("TotalPrice")
        
        if missing_essential:
            raise DataValidationError("Missing required data: Please ensure your file has a Price and Customer column.")

    # Check metadata columns
    for col in METADATA_COLUMNS:
        raw_name = mapping.get(col)
        if raw_name and raw_name in df.columns:
            rename_map[raw_name] = col

    out = df.rename(columns=rename_map).copy()
    
    # Fill missing columns with defaults
    if "TotalPrice" not in out.columns and "Quantity" in out.columns and "UnitPrice" in out.columns:
        out["TotalPrice"] = pd.to_numeric(out["Quantity"], errors="coerce") * pd.to_numeric(out["UnitPrice"], errors="coerce")
    
    for col in REQUIRED_COLUMNS:
        if col not in out.columns:
            if col in ("Quantity", "UnitPrice", "TotalPrice"):
                out[col] = 0.0
            elif col == "InvoiceDate":
                out[col] = pd.NaT
            else:
                out[col] = "Unknown"
                
    return out[REQUIRED_COLUMNS].copy()

def validate_and_convert_csv(file_data: io.BytesIO, filename: str = "") -> Tuple[pd.DataFrame, Dict[str, Optional[str]]]:
    try:
        if filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_data, engine='openpyxl')
            # Robust Date Normalization: Handle Excel serials or mixed types
            date_candidates = [c for c in df.columns if any(kw in str(c).lower() for kw in ["date", "time", "timestamp"])]
            for col in date_candidates:
                # If column contains numeric values (likely Excel serials)
                if pd.to_numeric(df[col], errors='coerce').notnull().any():
                    df[col] = pd.to_datetime(pd.to_numeric(df[col], errors='coerce'), unit='D', origin='1899-12-30')
                else:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
        else:
            df = pd.read_csv(file_data)
    except Exception as exc:
        raise DataValidationError(f"Invalid file format: {str(exc)}")
    
    mapping = infer_column_mapping(df)
    std = apply_column_mapping(df, mapping)
    return std, mapping

# --- CLEANING & RFM ---
def clean_transactions(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    
    # Conversion with coercion
    for col in ["CustomerID", "Quantity", "UnitPrice", "TotalPrice"]:
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0.0)
    
    out["InvoiceDate"] = pd.to_datetime(out["InvoiceDate"], errors="coerce")
    out["InvoiceNo"] = out["InvoiceNo"].astype(str).fillna("Unknown")
    out["StockCode"] = out["StockCode"].astype(str).fillna("Unknown")
    out["Description"] = out["Description"].astype(str).fillna("")
    
    # Recalculate TotalPrice only if it was 0 but we have parts
    mask = (out["TotalPrice"] == 0) & (out["Quantity"] > 0) & (out["UnitPrice"] > 0)
    out.loc[mask, "TotalPrice"] = out.loc[mask, "Quantity"] * out.loc[mask, "UnitPrice"]
    
    # Final cleanup
    out = out.dropna(subset=["CustomerID", "InvoiceDate"])
    out = out[out["CustomerID"] != 0] # Remove null/zero customers
    
    out["Category"] = out["Description"].str.strip().str.split().str[0].fillna("General")
    out["ProductLabel"] = out["StockCode"] + " — " + out["Description"]
    
    # LIVE ANALYSIS: Calculate row-level features for instant feedback
    max_date = out["InvoiceDate"].max()
    out["Monetary"] = out["UnitPrice"] * out["Quantity"]
    out["Recency"] = (max_date - out["InvoiceDate"]).dt.days
    
    return out.reset_index(drop=True)

def compute_rfm(df: pd.DataFrame, as_of: Optional[pd.Timestamp] = None) -> pd.DataFrame:
    if df.empty: return pd.DataFrame()
    if as_of is None:
        as_of = pd.to_datetime(df["InvoiceDate"].max()) + pd.Timedelta(days=1)
    rfm = df.groupby("CustomerID", as_index=False).agg(
        LastPurchase=("InvoiceDate", "max"),
        Frequency=("InvoiceNo", "nunique"),
        Monetary=("TotalPrice", "sum"),
    )
    rfm["Recency"] = (as_of - rfm["LastPurchase"]).dt.days.astype(int)
    return rfm.drop(columns=["LastPurchase"])

def score_quintiles(values: pd.Series, ascending: bool = True) -> pd.Series:
    if values.empty: return values.astype(int)
    ranked = values.rank(method="first", ascending=ascending)
    if values.nunique() <= 1: return pd.Series([3] * len(values), index=values.index)
    try:
        return pd.qcut(ranked, 5, labels=[1, 2, 3, 4, 5], duplicates="drop").astype(int)
    except:
        return pd.Series([3] * len(values), index=values.index)

def classify_segments(rfm: pd.DataFrame) -> pd.DataFrame:
    out = rfm.copy()
    out["R_Score"] = pd.cut(out["Recency"], bins=[-1, 30, 60, 90, 180, 10**9], labels=[5, 4, 3, 2, 1]).astype(int)
    out["F_Score"] = score_quintiles(out["Frequency"])
    out["M_Score"] = score_quintiles(out["Monetary"])
    
    def segment_row(r):
        # Mandatory Champion Logic: Spent > $500 AND ordered > 3 times
        if r["Monetary"] > 500 and r["Frequency"] > 3:
            return "Champion"
        
        R, F, M = int(r["R_Score"]), int(r["F_Score"]), int(r["M_Score"])
        if R >= 4 and F >= 4: return "Potential Loyalist"
        if R >= 3 and F >= 3: return "Loyal"
        if R <= 2: return "At-Risk"
        return "Lost"
    
    out["Segment"] = out.apply(segment_row, axis=1)
    return out

def update_rfm_segments(tx_df: pd.DataFrame, rfm_cfg: Optional[RFMConfig] = None) -> pd.DataFrame:
    if rfm_cfg is None:
        rfm_cfg = RFMConfig()
    
    # Ensure data is cleaned and types are correct before computation
    tx_df = clean_transactions(tx_df)
    
    rfm = compute_rfm(tx_df, rfm_cfg.as_of)
    if rfm.empty:
        return rfm
    return classify_segments(rfm)

# --- APRIORI & CO-OCCURRENCE ---
def build_apriori_rules(transactions: pd.DataFrame, min_support: int = 2, top_n: int = 5) -> list[dict]:
    rules = []
    if transactions.empty: return rules
    baskets = transactions.groupby('InvoiceNo')['ProductLabel'].agg(lambda items: sorted(set(items))).tolist()
    item_counts = Counter()
    pair_counts = Counter()
    for basket in baskets:
        for item in basket: item_counts[item] += 1
        for a, b in combinations(basket, 2):
            pair_counts[(a, b)] += 1
            pair_counts[(b, a)] += 1
    for (a, b), count in pair_counts.items():
        if count < min_support: continue
        support = item_counts.get(a, 0)
        if support == 0: continue
        rules.append({'antecedent': a, 'consequent': b, 'support': count, 'confidence': round(count / support, 3)})
    rules = sorted(rules, key=lambda x: (x['confidence'], x['support']), reverse=True)
    seen = set()
    unique_rules = []
    for r in rules:
        if (r['antecedent'], r['consequent']) in seen: continue
        seen.add((r['antecedent'], r['consequent']))
        unique_rules.append(r)
        if len(unique_rules) >= top_n: break
    return unique_rules

def build_cooccurrence(transactions: pd.DataFrame) -> Dict[str, List[Tuple[str, int]]]:
    if transactions.empty: return {}
    baskets = transactions.groupby('InvoiceNo')['ProductLabel'].agg(lambda x: sorted(set(x))).tolist()
    pair_counts = Counter()
    for basket in baskets:
        for a, b in combinations(basket, 2):
            pair_counts[(a, b)] += 1
            pair_counts[(b, a)] += 1
    coo = {}
    for (a, b), c in pair_counts.items():
        coo.setdefault(a, []).append((b, c))
    for a in coo:
        coo[a] = sorted(coo[a], key=lambda x: (-x[1], x[0]))
    return coo

# --- RECOMMENDATIONS ---
def recommend_products(customer_id: int, transactions: pd.DataFrame, rfm: pd.DataFrame, 
                       seg_top_prods: Dict[str, pd.DataFrame], coo: Dict, cfg: RecommendationConfig = RecommendationConfig()):
    customer_id = int(customer_id)
    cust_rfm = rfm[rfm["CustomerID"].astype(str) == str(customer_id)]
    if cust_rfm.empty: raise DataValidationError(f"Unknown CustomerID: {customer_id}")
    seg = cust_rfm.iloc[0]["Segment"]
    base = seg_top_prods.get(seg, pd.DataFrame())
    if base.empty: return pd.DataFrame()
    
    purchased = set(transactions[transactions["CustomerID"].astype(str) == str(customer_id)]["ProductLabel"].unique())
    base["reasoning"] = f"Popular in your segment ({seg})"
    
    # Add category match and cross-sell bonus logic if needed
    return base[~base["ProductLabel"].isin(purchased)].head(cfg.top_n)

def build_segment_top_products(transactions: pd.DataFrame, rfm: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    if transactions.empty or rfm.empty: return {}
    merged = transactions.merge(rfm[["CustomerID", "Segment"]], on="CustomerID", how="left")
    grouped = merged.groupby(["Segment", "ProductLabel"]).agg(purchase_count=("InvoiceNo", "nunique"), monetary=("TotalPrice", "sum"))
    grouped["score"] = grouped["purchase_count"].astype(float) + grouped["monetary"].astype(float) / 100.0
    res = {}
    for seg, g in grouped.groupby("Segment"):
        res[seg] = g.sort_values("score", ascending=False).reset_index()
    return res

def get_best_seller_by_category(transactions: pd.DataFrame) -> dict:
    if transactions.empty: return {}
    group = transactions.groupby(['Category', 'ProductLabel']).agg(sales=('TotalPrice', 'sum'), count=('InvoiceNo', 'nunique'))
    group = group.sort_values(['sales', 'count'], ascending=False)
    best = {}
    for (category, label), _ in group.iterrows():
        if category not in best:
            best[category] = label
    return best

def get_overall_best_seller(transactions: pd.DataFrame) -> str:
    if transactions.empty: return 'Best Seller'
    top = transactions.groupby('ProductLabel').agg(sales=('TotalPrice', 'sum'), count=('InvoiceNo', 'nunique')).sort_values(['sales', 'count'], ascending=False)
    return str(top.index[0]) if not top.empty else 'Best Seller'

def find_last_purchase_label(customer: dict, transactions: pd.DataFrame) -> tuple[str, str]:
    if transactions is not None and not transactions.empty:
        customer_id = customer.get('CustomerID') or customer.get('customerId') or customer.get('id') or customer.get('_id')
        if customer_id:
            mask = transactions['CustomerID'].astype(str) == str(customer_id)
            user_tx = transactions[mask]
            if not user_tx.empty:
                latest = user_tx.sort_values('InvoiceDate', ascending=False).iloc[0]
                return str(latest['ProductLabel']), str(latest['Category'])
    return 'Unknown product', 'Unknown'

def build_analysis_pipeline(df_raw: pd.DataFrame) -> PipelineArtifacts:
    std = apply_column_mapping(df_raw)
    cleaned = clean_transactions(std)
    rfm = classify_segments(compute_rfm(cleaned))
    top_prods = build_segment_top_products(cleaned, rfm)
    coo = build_cooccurrence(cleaned)
    return PipelineArtifacts(cleaned, rfm, rfm["Segment"].value_counts().reset_index(), top_prods, {}, coo)
