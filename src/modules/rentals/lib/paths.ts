/** Where a rental unit and a rental order are read — for other modules that
 *  name one (WMS inward exceptions), so the routes stay owned here. */
export const rentalUnitPath = (deviceId: string) => `/rentals/tracking/${deviceId}`

export const rentalSalesOrderPath = (salesOrderId: string) =>
  `/rentals/sales-orders/${salesOrderId}`
