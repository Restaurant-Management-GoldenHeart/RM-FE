/**
 * reportApi.js
 *
 * Wrapper cho toàn bộ Report APIs của GoldenHeart Backend.
 *
 * Base: GET /api/v1/reports/...
 *
 * Auth:
 *   - /dashboard       → ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF, ROLE_KITCHEN
 *   - /revenue/*       → ROLE_ADMIN, ROLE_MANAGER
 *   - /payments/*      → ROLE_ADMIN, ROLE_MANAGER
 *   - /bills/*         → ROLE_ADMIN, ROLE_MANAGER
 */
import apiClient from './apiClient';

export const reportApi = {
  /**
   * 1. Dashboard Snapshot
   * GET /reports/dashboard?branchId={branchId}
   *
   * Response: DashboardReportResponse {
   *   branchId, branchName,
   *   totalEmployees, totalCustomers, totalMenuItems, totalInventoryItems,
   *   totalInventoryValue, lowStockItems, outOfStockItems,
   *   availableTables, occupiedTables, reservedTables, cleaningTables,
   *   activeOrders, pendingKitchenItems, processingKitchenItems, waitingStockItems,
   *   todayPaymentCount, todayPaidBills, todayCashIn,
   *   todayPaidBillRevenue, todayGrossProfit, todayAveragePaidBillValue,
   *   generatedAt
   * }
   */
  getDashboardReport: (branchId) =>
    apiClient.get('/reports/dashboard', { params: { branchId } }),

  /**
   * 2. Revenue Summary (DAY / WEEK / MONTH / YEAR)
   * GET /reports/revenue/summary?branchId=&periodType=&anchorDate=
   *
   * @param {number} branchId
   * @param {'DAY'|'WEEK'|'MONTH'|'YEAR'} periodType
   * @param {string} anchorDate  - ISO date string e.g. "2026-04-17"
   *
   * Response: RevenueSummaryResponse {
   *   branchId, branchName, periodType, fromDate, toDate,
   *   paymentCount, cashIn,
   *   paidBillsCount, paidBillRevenue,
   *   grossProfit, averagePaidBillValue,
   *   generatedAt
   * }
   */
  getRevenueSummary: (branchId, periodType, anchorDate) =>
    apiClient.get('/reports/revenue/summary', {
      params: { branchId, periodType, anchorDate },
    }),

  /**
   * 3. Revenue Timeseries (chart data)
   * GET /reports/revenue/timeseries?branchId=&fromDate=&toDate=&groupBy=
   *
   * @param {number} branchId
   * @param {string} fromDate  - ISO date e.g. "2026-04-01"
   * @param {string} toDate    - ISO date e.g. "2026-04-30"
   * @param {'DAY'|'WEEK'|'MONTH'} groupBy
   *
   * Response: RevenueTimeseriesResponse {
   *   branchId, branchName, groupBy, fromDate, toDate,
   *   totalPaymentCount, totalCashIn,
   *   totalPaidBillsCount, totalPaidBillRevenue, totalGrossProfit,
   *   points: RevenueTimeseriesPointResponse[] {
   *     periodKey, fromDate, toDate,
   *     paymentCount, cashIn,
   *     paidBillsCount, paidBillRevenue,
   *     grossProfit, averagePaidBillValue
   *   },
   *   generatedAt
   * }
   */
  getRevenueTimeseries: (branchId, fromDate, toDate, groupBy = 'DAY') =>
    apiClient.get('/reports/revenue/timeseries', {
      params: { branchId, fromDate, toDate, groupBy },
    }),

  /**
   * 4. Payment Method Breakdown (Pie/Donut chart)
   * GET /reports/payments/method-breakdown?branchId=&periodType=&anchorDate=
   *
   * @param {number} branchId
   * @param {'DAY'|'WEEK'|'MONTH'|'YEAR'} periodType
   * @param {string} anchorDate  - ISO date string
   *
   * Response: PaymentMethodBreakdownResponse {
   *   branchId, branchName, periodType, fromDate, toDate,
   *   totalPaymentCount, totalAmount,
   *   items: PaymentMethodBreakdownItemResponse[] {
   *     method, paymentCount, totalAmount, percentage
   *   },
   *   generatedAt
   * }
   */
  getPaymentMethodBreakdown: (branchId, periodType, anchorDate) =>
    apiClient.get('/reports/payments/method-breakdown', {
      params: { branchId, periodType, anchorDate },
    }),

  /**
   * 5. Bill Status Summary (Unpaid / Partial / Paid snapshot)
   * GET /reports/bills/status-summary?branchId=
   *
   * @param {number} branchId
   *
   * Response: BillStatusSummaryResponse {
   *   branchId, branchName,
   *   unpaidBills, partialBills, paidBills, totalBills,
   *   generatedAt
   * }
   */
  getBillStatusSummary: (branchId) =>
    apiClient.get('/reports/bills/status-summary', { params: { branchId } }),
};

export default reportApi;
