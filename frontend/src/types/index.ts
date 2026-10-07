export interface UploadReport {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  missing_value_rows: number;
  waste_available: boolean;
  issues: { row_number: number; reasons: string[]; values: Record<string, string> }[];
  warnings: string[];
}

export interface UploadBatch {
  id: number;
  original_filename: string;
  uploaded_at: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  missing_value_records: number;
  status: string;
  waste_available: boolean;
  validation_report: UploadReport;
}

export interface MetricRow { [key: string]: string | number | null }
export interface DashboardData {
  upload_id: number;
  currency: string;
  filters: Record<string, string | null>;
  available_items: string[];
  summary: {
    total_sales: number;
    total_transactions: number;
    average_sale_value: number;
    best_selling_item: string | null;
    best_sales_day: string | null;
    peak_sales_hour: string | null;
    lowest_performing_item: string | null;
    lowest_sales_hour: string | null;
    best_sales_period: string | null;
  };
  top_items: { item: string; transactions: number; revenue: number; revenue_share: number; average_sale: number; status: string }[];
  item_share: { item: string; revenue: number; share: number }[];
  sales_by_day: { day: string; revenue: number; transactions: number }[];
  sales_by_time: { period: string; revenue: number; transactions: number }[];
  hourly_sales: { hour: string; revenue: number; transactions: number }[];
  trends: { period: string; revenue: number; transactions: number }[];
  products: { item: string; transactions: number; revenue: number; revenue_share: number; average_sale: number; status: string }[];
  waste: { available: boolean; total_quantity: number; total_cost: number; waste_percentage: number | null; percentage_note: string; by_item: { item: string; quantity: number; cost: number }[]; by_day: { day: string; quantity: number }[]; trend: { date: string; quantity: number; cost: number }[] };
  insights: string[];
  recommendations: string[];
}
