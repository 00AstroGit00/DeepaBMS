export const typeDefs = `#graphql
  type OccupancyMetrics {
    occupancy: Float!
    adr: Float!
    revpar: Float!
  }

  type ProfitLossMetrics {
    revenue: Float!
    expenses: Float!
    profit: Float!
  }

  type ReorderAlert {
    itemId: String!
    itemName: String!
    currentStock: Float!
    reorderLevel: Float!
    reorderQuantity: Float!
    supplierId: String
    supplierName: String
  }

  type StockAgeing {
    itemId: String!
    itemName: String!
    batch: String
    daysInStock: Int!
    quantity: Float!
    value: Float!
    category: String!
  }

  type ReceivablesPayables {
    receivables: Float!
    payables: Float!
    netBalance: Float!
  }

  type KpiValue {
    kpiKey: String!
    value: Float!
    previousValue: Float
    change: Float
    changePercent: Float
    trend: String
    timestamp: String
  }

  type OperationalKpi {
    dailyRevenue: Float!
    occupancy: Float!
    adr: Float!
    revpar: Float!
    restaurantCovers: Float!
    averageBill: Float!
    barSales: Float!
    inventoryTurnover: Float!
    purchaseEfficiency: Float!
    wastePercent: Float!
    complimentaryPercent: Float!
    cancellationPercent: Float!
    refundPercent: Float!
    outstandingPayments: Float!
    cashPosition: Float!
  }

  type Query {
    dailyRevenue(date: String!): Float!
    occupancyAdrRevpar(startDate: String!, endDate: String!): OccupancyMetrics!
    profitLoss(startDate: String!, endDate: String!): ProfitLossMetrics!
    reorderAlerts: [ReorderAlert!]!
    stockAgeing: [StockAgeing!]!
    receivablesPayables: ReceivablesPayables!
    operationalKpis(startDate: String!, endDate: String!): OperationalKpi!
    dashboardKpiValues(role: String!): [KpiValue!]!
  }
`;
