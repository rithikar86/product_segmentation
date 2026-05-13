// VoltStream Mock Data - Electrical & Electronics Retail Intelligence
// RFM Segments: Elite Tech Buyers, Regular DIYers, One-time Project Buyers, Churn Risk

export interface Customer {
  id: string
  name: string
  email: string
  rfmScore: number
  segment: string
  totalSpent: number
  frequency: number
  recency: number
  lastPurchase: string
  sentiment: "positive" | "neutral" | "negative"
  feedbackScore: number
}

export interface AssociationRule {
  antecedent: string
  consequent: string
  confidence: number
  lift: number
  support: number
  segment?: string
}

export interface InventoryProduct {
  id: string
  name: string
  category: "Lighting" | "Wiring" | "Power Devices" | "Consumer Electronics"
  price: number
  stock: number
  reorderLevel: number
  rating: number
  reviews: number
}

export interface InventoryItem {
  productId: string
  name: string
  stock: number
  lowStockThreshold: number
  status: "healthy" | "warning" | "critical"
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  rating: number
  reviews: number
  image: string
  tags: string[]
}

export interface Notification {
  id: number
  type: "stock" | "churn" | "feedback" | "sales"
  message: string
  timestamp: Date
  priority: "high" | "medium" | "low"
}

export interface Complaint {
  keyword: string
  severity: "low" | "medium" | "high"
  count: number
  products: string[]
  percentage: number
}

export const segments = [
  { name: "Elite Tech Buyers", color: "#3b82f6", count: 2 },
  { name: "Regular DIYers", color: "#22c55e", count: 2 },
  { name: "One-time Project Buyers", color: "#f59e0b", count: 2 },
  { name: "Churn Risk", color: "#ef4444", count: 2 },
]

export const mockCustomers: Customer[] = [
  { id: "C001", name: "John Smith", email: "john@example.com", rfmScore: 95, segment: "Elite Tech Buyers", totalSpent: 4850, frequency: 24, recency: 2, lastPurchase: "2024-04-10", sentiment: "positive", feedbackScore: 9.2 },
  { id: "C002", name: "Sarah Johnson", email: "sarah@example.com", rfmScore: 87, segment: "Elite Tech Buyers", totalSpent: 3620, frequency: 18, recency: 5, lastPurchase: "2024-04-08", sentiment: "positive", feedbackScore: 8.8 },
  { id: "C003", name: "Mike Chen", email: "mike@example.com", rfmScore: 72, segment: "Regular DIYers", totalSpent: 2140, frequency: 12, recency: 8, lastPurchase: "2024-04-05", sentiment: "positive", feedbackScore: 8.1 },
  { id: "C004", name: "Emma Wilson", email: "emma@example.com", rfmScore: 65, segment: "Regular DIYers", totalSpent: 1890, frequency: 9, recency: 12, lastPurchase: "2024-03-30", sentiment: "neutral", feedbackScore: 7.2 },
  { id: "C005", name: "Alex Martinez", email: "alex@example.com", rfmScore: 45, segment: "One-time Project Buyers", totalSpent: 820, frequency: 2, recency: 35, lastPurchase: "2024-02-15", sentiment: "positive", feedbackScore: 7.8 },
  { id: "C006", name: "Lisa Anderson", email: "lisa@example.com", rfmScore: 38, segment: "One-time Project Buyers", totalSpent: 640, frequency: 1, recency: 58, lastPurchase: "2024-01-20", sentiment: "neutral", feedbackScore: 6.9 },
  { id: "C007", name: "David Brown", email: "david@example.com", rfmScore: 22, segment: "Churn Risk", totalSpent: 1250, frequency: 5, recency: 120, lastPurchase: "2023-12-15", sentiment: "negative", feedbackScore: 4.2 },
  { id: "C008", name: "Jennifer Lee", email: "jen@example.com", rfmScore: 28, segment: "Churn Risk", totalSpent: 920, frequency: 3, recency: 95, lastPurchase: "2023-12-30", sentiment: "negative", feedbackScore: 5.1 },
]

export const mockProducts: Product[] = [
  { id: "P001", name: "Professional LED Drill Kit", category: "Power Tools", price: 189.99, rating: 4.8, reviews: 234, image: "🔧", tags: ["Premium", "Professional"] },
  { id: "P002", name: "Smart Home Automation Starter", category: "Smart Electronics", price: 249.99, rating: 4.6, reviews: 156, image: "🏠", tags: ["Smart", "Trending"] },
  { id: "P003", name: "Industrial Cordless Drill", category: "Power Tools", price: 279.99, rating: 4.7, reviews: 189, image: "⚡", tags: ["Professional", "Heavy-Duty"] },
  { id: "P004", name: "Electrical Component Starter Pack", category: "Electrical Components", price: 59.99, rating: 4.5, reviews: 342, image: "📦", tags: ["Value", "Beginner-Friendly"] },
  { id: "P005", name: "WiFi Smart Lighting System", category: "Smart Electronics", price: 129.99, rating: 4.4, reviews: 298, image: "💡", tags: ["Smart", "Energy-Efficient"] },
  { id: "P006", name: "Heavy-Duty Wire Strippers Set", category: "Hand Tools", price: 34.99, rating: 4.9, reviews: 412, image: "✂️", tags: ["Essential", "Best-Seller"] },
  { id: "P007", name: "Solar Panel Kit 5kW", category: "Energy Solutions", price: 2199.99, rating: 4.7, reviews: 87, image: "☀️", tags: ["Green", "Premium"] },
  { id: "P008", name: "USB Charging Hub Pro", category: "Accessories", price: 24.99, rating: 4.3, reviews: 567, image: "🔌", tags: ["Value", "Essential"] },
]

// VoltStream Inventory Products - Electrical & Electronics Categories
export const mockInventoryProducts: InventoryProduct[] = [
  { id: "INV001", name: "LED Ceiling Light 60W", category: "Lighting", price: 45.99, stock: 28, reorderLevel: 15, rating: 4.6, reviews: 234 },
  { id: "INV002", name: "Emergency Tube Light 40W", category: "Lighting", price: 28.50, stock: 8, reorderLevel: 20, rating: 4.4, reviews: 156 },
  { id: "INV003", name: "Electrical Wire 2.5mm (100m)", category: "Wiring", price: 35.00, stock: 42, reorderLevel: 30, rating: 4.8, reviews: 412 },
  { id: "INV004", name: "House Wiring Cable 1.5mm", category: "Wiring", price: 22.99, stock: 5, reorderLevel: 25, rating: 4.5, reviews: 289 },
  { id: "INV005", name: "MCB Single Pole 16A", category: "Power Devices", price: 12.50, stock: 156, reorderLevel: 50, rating: 4.7, reviews: 523 },
  { id: "INV006", name: "Power Stabilizer 5kVA", category: "Power Devices", price: 189.99, stock: 3, reorderLevel: 5, rating: 4.6, reviews: 87 },
  { id: "INV007", name: "Inverter 1500W Pure Sine", category: "Power Devices", stock: 12, price: 299.99, reorderLevel: 10, rating: 4.9, reviews: 198 },
  { id: "INV008", name: "Tubular Battery 150Ah", category: "Power Devices", price: 189.50, stock: 6, reorderLevel: 8, rating: 4.8, reviews: 145 },
  { id: "INV009", name: "Smartphone Fast Charger 65W", category: "Consumer Electronics", price: 24.99, stock: 89, reorderLevel: 40, rating: 4.5, reviews: 567 },
  { id: "INV010", name: "Tablet Charging Cable Type-C", category: "Consumer Electronics", price: 12.99, stock: 145, reorderLevel: 60, rating: 4.4, reviews: 298 },
]

// Association Rules for Market Basket Analysis
export const mockAssociationRules: AssociationRule[] = [
  { antecedent: "Inverter 1500W Pure Sine", consequent: "Tubular Battery 150Ah", confidence: 0.92, lift: 3.2, support: 0.18 },
  { antecedent: "Power Stabilizer 5kVA", consequent: "MCB Single Pole 16A", confidence: 0.87, lift: 2.8, support: 0.14 },
  { antecedent: "Electrical Wire 2.5mm", consequent: "MCB Single Pole 16A", confidence: 0.85, lift: 2.6, support: 0.22 },
  { antecedent: "Smartphone Fast Charger 65W", consequent: "Tablet Charging Cable Type-C", confidence: 0.78, lift: 1.95, support: 0.31 },
  { antecedent: "LED Ceiling Light 60W", consequent: "Electrical Wire 2.5mm", confidence: 0.81, lift: 2.3, support: 0.26 },
  { antecedent: "Emergency Tube Light 40W", consequent: "Power Stabilizer 5kVA", confidence: 0.76, lift: 1.8, support: 0.12 },
]

export const mockInventory: InventoryItem[] = [
  { productId: "P001", name: "Professional LED Drill Kit", stock: 12, lowStockThreshold: 20, status: "warning" },
  { productId: "P002", name: "Smart Home Automation Starter", stock: 34, lowStockThreshold: 25, status: "healthy" },
  { productId: "P004", name: "Electrical Component Starter Pack", stock: 5, lowStockThreshold: 15, status: "critical" },
  { productId: "P005", name: "WiFi Smart Lighting System", stock: 18, lowStockThreshold: 20, status: "warning" },
  { productId: "P007", name: "Solar Panel Kit 5kW", stock: 2, lowStockThreshold: 5, status: "critical" },
]

export const mockNotifications: Notification[] = [
  { id: 1, type: "stock", message: "Solar Panel Kit 5kW critically low (2 units)", timestamp: new Date(Date.now() - 5 * 60000), priority: "high" },
  { id: 2, type: "churn", message: "David Brown inactive for 120 days - Churn risk detected", timestamp: new Date(Date.now() - 15 * 60000), priority: "high" },
  { id: 3, type: "feedback", message: "Negative feedback spike on Power Tools category", timestamp: new Date(Date.now() - 45 * 60000), priority: "medium" },
  { id: 4, type: "sales", message: "Elite Tech Buyers segment conversion: +12% this week", timestamp: new Date(Date.now() - 120 * 60000), priority: "low" },
  { id: 5, type: "stock", message: "Professional LED Drill Kit low stock (12 units)", timestamp: new Date(Date.now() - 180 * 60000), priority: "medium" },
]

export const mockComplaints: Complaint[] = [
  { keyword: "Quality issues", severity: "high", count: 12, products: ["P001", "P003"], percentage: 35 },
  { keyword: "Defective on arrival", severity: "high", count: 8, products: ["P002", "P005"], percentage: 23 },
  { keyword: "Poor documentation", severity: "medium", count: 6, products: ["P007"], percentage: 17 },
  { keyword: "Slow shipping", severity: "medium", count: 5, products: ["P001", "P004"], percentage: 14 },
  { keyword: "Not as described", severity: "low", count: 3, products: ["P008"], percentage: 9 },
]

export const mockDashboardData = {
  totalCustomers: 8,
  activeSegments: 4,
  lowStockAlerts: 3,
  campaignConversionRate: 23.5,
  avgOrderValue: 1565,
  churnRiskCount: 2,
}

export const mockCategorySales = [
  { category: "Power Tools", sales: 12450, percentage: 28 },
  { category: "Smart Electronics", sales: 9820, percentage: 22 },
  { category: "Electrical Components", sales: 7650, percentage: 17 },
  { category: "Hand Tools", sales: 6340, percentage: 14 },
  { category: "Energy Solutions", sales: 5280, percentage: 12 },
  { category: "Accessories", sales: 2560, percentage: 7 },
]

export interface RecentActivity {
  id: string
  customerId: string
  action: string
  segment: string
  timestamp: string
}

export const recentActivity: RecentActivity[] = [
  {
    id: "A001",
    customerId: "C001",
    action: "Completed purchase of an inverter package.",
    segment: "Elite Tech Buyers",
    timestamp: "5m ago",
  },
  {
    id: "A002",
    customerId: "C004",
    action: "Opened promotional email for smart lighting.",
    segment: "Regular DIYers",
    timestamp: "12m ago",
  },
  {
    id: "A003",
    customerId: "C007",
    action: "Clicked on churn recovery offer.",
    segment: "Churn Risk",
    timestamp: "20m ago",
  },
  {
    id: "A004",
    customerId: "C003",
    action: "Viewed recommended power tools.",
    segment: "Regular DIYers",
    timestamp: "35m ago",
  },
]

export const mockSegmentOffers = {
  "Elite Tech Buyers": {
    offer: "Exclusive 15% off professional equipment",
    message: "Premium members get early access to new releases",
    incentive: "Free shipping on orders over ₹200",
  },
  "Regular DIYers": {
    offer: "Bundle deals: Buy 2, save 20%",
    message: "Perfect for your next home project",
    incentive: "Loyalty points on every purchase",
  },
  "One-time Project Buyers": {
    offer: "Come back and save 10%",
    message: "We&apos;ve added new products since your last visit",
    incentive: "Free returns within 60 days",
  },
  "Churn Risk": {
    offer: "We miss you! 25% off your next order",
    message: "See what&apos;s new and improved",
    incentive: "Exclusive access to clearance items",
  },
}

export const mockRecommendationRules = [
  { segment: "Elite Tech Buyers", category: "Power Tools", relatedCategories: ["Smart Electronics", "Accessories"], confidence: 0.92 },
  { segment: "Elite Tech Buyers", category: "Energy Solutions", relatedCategories: ["Smart Electronics", "Electrical Components"], confidence: 0.88 },
  { segment: "Regular DIYers", category: "Power Tools", relatedCategories: ["Hand Tools", "Electrical Components"], confidence: 0.85 },
  { segment: "One-time Project Buyers", category: "Electrical Components", relatedCategories: ["Hand Tools", "Accessories"], confidence: 0.79 },
]

export function getSegmentColor(segment: string): string {
  const seg = segments.find((s) => s.name === segment)
  return seg?.color || "#6b7280"
}

export function formatCurrency(value: number | string): string {
  let parsed = typeof value === "string" ? Number(value.toString().replace(/[^0-9.-]+/g, "")) : value
  if (typeof parsed !== "number" || Number.isNaN(parsed)) {
    parsed = 0
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parsed)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}
