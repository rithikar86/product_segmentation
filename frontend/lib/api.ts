// This is the address of your Python Flask server
export const API_BASE_URL = "/api";

async function handleJsonResponse(response: Response) {
  const text = await response.text();
  console.log(`Response status: ${response.status} ${response.statusText}`);
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Failed to parse JSON response content:", text);
    return { error: `Server Error (${response.status}): Unable to parse response.` };
  }
}

export async function signIn(payload: { email: string; password: string }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Auth login error:", error);
    return { success: false, error: "Server Connection Failed" };
  }
}

export async function signUp(payload: { 
  email: string; 
  password: string; 
  shopName: string;
  ownerName: string;
  location: string;
}) {
  console.log("Connecting to:", API_BASE_URL);
  console.log('Attempting connection to backend...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Auth signup error:", error);
    return { success: false, error: "Server Connection Failed" };
  }
}

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const accessToken = localStorage.getItem("accessToken");
  const token = localStorage.getItem("token");
  const finalToken = accessToken || token;
  
  console.log("Auth Debug - localStorage accessToken:", accessToken);
  console.log("Auth Debug - localStorage token:", token);
  
  return finalToken ? { "Authorization": `Bearer ${finalToken}` } : {};
}

export async function fetchCustomers() {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Connection Error:", error);
    return [];
  }
}

export async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Stats fetch error:", error);
    return null;
  }
}

export async function fetchDashboardStats(category?: string) {
  try {
    const url = new URL(`${window.location.origin}${API_BASE_URL}/dashboard/stats`);
    if (category) url.searchParams.append('category', category);
    
    const response = await fetch(url.toString(), {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Dashboard stats fetch error:", error);
    return null;
  }
}

export async function fetchDashboardTopProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/top-products`, {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Dashboard top products fetch error:", error);
    return null;
  }
}

export async function uploadCSV(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Unable to connect to the server for upload." };
  }
}

export async function fetchInventory() {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return { success: false, inventory: [] };
  }
}

export async function fetchRecommendations() {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      headers: { ...getAuthHeaders() }
    });
    return await handleJsonResponse(response);
  } catch (error) {
    console.error("Recommendations fetch error:", error);
    return { success: false, recommendations: [] };
  }
}