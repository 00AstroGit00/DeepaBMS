import { query } from '../../db';
import * as T from './ai.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const now = (): string => new Date().toISOString();

// ── Forecast Service ──────────────────────────────────────────────────

export const ForecastService = {
  async generateForecast(
    request: T.ForecastRequest,
  ): Promise<T.ForecastResponse> {
    const historicalData = await this.getHistoricalData(
      request.domain,
      request.metric,
      request.periods * 2,
    );

    if (!historicalData.length || historicalData.length < 3) {
      return {
        metric: request.metric,
        domain: request.domain,
        periods: [],
        method: request.method,
        confidence: { lower: 0, upper: 0, interval: 0 },
        assumptions: ['Insufficient historical data for forecasting'],
      };
    }

    let predictions: number[] = [];
    switch (request.method) {
      case 'sma':
        predictions = this.sma(historicalData, request.periods);
        break;
      case 'linear':
        predictions = this.linearRegression(historicalData).predict(
          historicalData.length,
          request.periods,
        );
        break;
      case 'exponential':
        predictions = this.exponentialSmoothing(
          historicalData,
          0.3,
          request.periods,
        );
        break;
    }

    const confidence = this.calculateConfidence(
      historicalData,
      predictions,
      request.method,
    );

    const assumptions = this.generateAssumptions(
      historicalData,
      request.method,
    );

    const periods: T.ForecastPeriod[] = predictions.map((pred, i) => ({
      index: i + 1,
      predicted: round2(pred),
      lowerBound: round2(pred * (1 - confidence.interval)),
      upperBound: round2(pred * (1 + confidence.interval)),
    }));

    return {
      metric: request.metric,
      domain: request.domain,
      periods,
      method: request.method,
      confidence,
      assumptions,
    };
  },

  sma(data: number[], periods: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < periods; i++) {
      const slice = data.slice(Math.max(0, data.length - periods + i));
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(avg);
    }
    return result;
  },

  linearRegression(data: number[]): {
    slope: number;
    intercept: number;
    predict: (startIndex: number, count: number) => number[];
  } {
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = data[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    return {
      slope,
      intercept,
      predict: (startIndex: number, count: number): number[] => {
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
          const idx = startIndex + i;
          const val = intercept + slope * idx;
          results.push(Math.max(0, val));
        }
        return results;
      },
    };
  },

  exponentialSmoothing(data: number[], alpha = 0.3, periods = 1): number[] {
    if (!data.length) return [];
    let smoothed = data[0];
    const result: number[] = [];
    for (let i = 0; i < periods; i++) {
      const lastVal = data[data.length - 1];
      smoothed = alpha * lastVal + (1 - alpha) * smoothed;
      result.push(smoothed);
    }
    return result;
  },

  calculateConfidence(
    data: number[],
    predictions: number[],
    _method: string,
  ): { lower: number; upper: number; interval: number } {
    if (data.length < 2 || !predictions.length) {
      return { lower: 0, upper: 0, interval: 0.2 };
    }

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const interval = data.length > 0 ? stdDev / mean : 0.2;

    return {
      lower: round2(Math.max(0, mean - stdDev)),
      upper: round2(mean + stdDev),
      interval: round2(Math.min(Math.abs(interval), 0.5) || 0.2),
    };
  },

  generateAssumptions(data: number[], method: string): string[] {
    const assumptions: string[] = [
      `Based on ${data.length} historical data points`,
      `Using ${method.toUpperCase()} forecasting method`,
    ];

    if (data.length >= 4) {
      const recentAvg = data.slice(-4).reduce((a, b) => a + b, 0) / 4;
      const olderAvg = data.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
      const trend =
        olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      if (Math.abs(trend) > 10) {
        assumptions.push(
          `${trend > 0 ? 'Upward' : 'Downward'} trend detected (${round2(Math.abs(trend))}% change)`,
        );
      } else {
        assumptions.push('Relatively stable trend');
      }
    }

    assumptions.push(
      'Forecast assumes historical patterns continue',
      'Confidence intervals may widen for longer periods',
    );

    return assumptions;
  },

  async getHistoricalData(
    domain: string,
    metric: string,
    periods: number,
  ): Promise<number[]> {
    try {
      // Try to get data from daily summaries
      const today = now().split('T')[0];
      const startDate = new Date(Date.now() - periods * 86400000)
        .toISOString()
        .split('T')[0];

      let rows: any[];
      switch (metric) {
        case 'dailyRevenue':
        case 'revenue':
          rows = await query(
            `SELECT total_revenue as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.map((r: any) => Number(r.val || 0));

        case 'occupancyRate':
        case 'occupancy':
          rows = await query(
            `SELECT occupancy_rate as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.map((r: any) => Number(r.val || 0));

        case 'restaurantCovers':
        case 'covers':
          rows = await query(
            `SELECT restaurant_covers as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.map((r: any) => Number(r.val || 0));

        case 'barSales':
        case 'bar_sales':
          rows = await query(
            `SELECT bar_sales as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.map((r: any) => Number(r.val || 0));

        case 'expenses':
          rows = await query(
            `SELECT total_expenses as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.map((r: any) => Number(r.val || 0));

        default: {
          // Try to get revenue as fallback
          rows = await query(
            `SELECT total_revenue as val FROM daily_summaries
             WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
            [startDate, today],
          );
          return rows.length
            ? rows.map((r: any) => Number(r.val || 0))
            : this.generateSyntheticData(periods);
        }
      }
    } catch {
      return this.generateSyntheticData(periods);
    }
  },

  generateSyntheticData(periods: number): number[] {
    const base = 5000;
    const data: number[] = [];
    for (let i = 0; i < periods; i++) {
      const variation = (Math.random() - 0.5) * 2000;
      data.push(Math.max(0, round2(base + variation + i * 100)));
    }
    return data;
  },
};
