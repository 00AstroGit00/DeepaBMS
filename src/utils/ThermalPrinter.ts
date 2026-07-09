import * as Print from 'expo-print';
import { Sale, Stay, Guest } from '../context/StoreContext';
import { inr } from './helpers';

export const ThermalPrinter = {
  printReceipt: async (sale: Sale, businessName: string, gstin: string) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 300px; font-size: 12px; color: #000; margin: 0; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${businessName}</div>
          <div class="center">GSTIN: ${gstin}</div>
          <div class="center">Tax Invoice</div>
          <div class="divider"></div>
          
          <div class="row">
            <span>Bill No: ${sale.billNo || sale.id.substring(0, 8)}</span>
            <span>Date: ${new Date(sale.date).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span>Time: ${new Date(sale.date).toLocaleTimeString()}</span>
            <span>Mode: ${sale.mode.toUpperCase()}</span>
          </div>
          <div class="row">
            <span>Dept: ${sale.dept.toUpperCase()}</span>
          </div>
          
          <div class="divider"></div>
          <div class="row bold">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div class="divider"></div>
          
          <div class="row">
            <span style="flex:1;">${sale.description}</span>
            <span>${inr(sale.amount)}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="row mt-2">
            <span>Subtotal:</span>
            <span>${inr(sale.amount)}</span>
          </div>
          <div class="row">
            <span>GST (${sale.gstRate}%):</span>
            <span>${inr(sale.gstAmount)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="row bold" style="font-size: 14px;">
            <span>TOTAL:</span>
            <span>${inr(sale.total)}</span>
          </div>
          <div class="divider"></div>
          
          <div class="center mt-4">Thank you for visiting!</div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({
        html,
        printerUrl: undefined, // Will prompt the user to select a printer on their device
      });
    } catch (error) {
      console.error('Failed to print receipt', error);
      throw error;
    }
  },

  printCheckOut: async (stay: Stay, businessName: string, gstin: string) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 300px; font-size: 12px; color: #000; margin: 0; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${businessName}</div>
          <div class="center">GSTIN: ${gstin}</div>
          <div class="center">Guest Checkout Bill</div>
          <div class="divider"></div>
          
          <div>Guest: ${stay.guestName}</div>
          <div>Phone: ${stay.phone}</div>
          <div>Room: ${stay.roomNo} (${stay.category})</div>
          <div>Check-in: ${new Date(stay.checkIn).toLocaleDateString()}</div>
          <div>Check-out: ${new Date(stay.checkOut).toLocaleDateString()}</div>
          <div>Duration: ${stay.nights} Nights</div>
          
          <div class="divider"></div>
          <div class="row bold" style="font-size: 14px;">
            <span>TOTAL PAID:</span>
            <span>${inr(stay.amount)}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="margin-top: 16px;">Thank you for your stay!</div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Failed to print checkout', error);
      throw error;
    }
  }
};
