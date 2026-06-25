export const DEFAULT_PRODUCTION_STATION = 'KITCHEN';

export const PRODUCTION_STATIONS = Object.freeze([
  {
    id: 'KITCHEN',
    label: 'Bếp',
    shortLabel: 'Bếp',
    description: 'Món cần bếp nấu hoặc chế biến nóng.',
  },
  {
    id: 'BAR',
    label: 'Pha chế',
    shortLabel: 'Pha chế',
    description: 'Nước cam, cocktail, mocktail, nước ép và đồ uống pha tại quầy.',
  },
  {
    id: 'SERVICE',
    label: 'Phục vụ trực tiếp',
    shortLabel: 'Trực tiếp',
    description: 'Món/đồ uống chỉ cần lấy ra phục vụ, ví dụ nước đóng chai.',
  },
]);

export const PRODUCTION_STATION_LABELS = Object.freeze(
  PRODUCTION_STATIONS.reduce((acc, station) => {
    acc[station.id] = station.label;
    return acc;
  }, {})
);

export const KITCHEN_STATION_COPY = Object.freeze({
  KITCHEN: {
    headerTitle: 'KDS - Điều phối bếp',
    subtitle: 'Tự động cập nhật mỗi 3s',
    pendingLabel: 'Chờ nấu',
    pendingShortLabel: 'Chờ',
    processingLabel: 'Đang nấu',
    processingShortLabel: 'Nấu',
    readyLabel: 'Sẵn sàng',
    readyShortLabel: 'Xong',
    desktopPendingTitle: 'Chờ nấu',
    desktopProcessingTitle: 'Đang nấu',
    desktopReadyTitle: 'Sẵn sàng phục vụ',
    desktopCancelledTitle: 'Món đã hủy',
    startAction: 'Bắt đầu nấu',
    retryAction: 'Nấu lại',
    completeAction: 'Hoàn tất',
    priorityText: 'Ưu tiên xử lý',
  },
  BAR: {
    headerTitle: 'KDS - Quầy pha chế',
    subtitle: 'Nước pha chế và đồ uống làm tại quầy',
    pendingLabel: 'Chờ pha',
    pendingShortLabel: 'Chờ',
    processingLabel: 'Đang pha',
    processingShortLabel: 'Pha',
    readyLabel: 'Pha xong',
    readyShortLabel: 'Xong',
    desktopPendingTitle: 'Chờ pha chế',
    desktopProcessingTitle: 'Đang pha',
    desktopReadyTitle: 'Pha xong',
    desktopCancelledTitle: 'Đồ uống đã hủy',
    startAction: 'Bắt đầu pha',
    retryAction: 'Pha lại',
    completeAction: 'Pha xong',
    priorityText: 'Ưu tiên pha chế',
  },
  SERVICE: {
    headerTitle: 'KDS - Phục vụ trực tiếp',
    subtitle: 'Món/đồ uống chỉ cần lấy ra phục vụ',
    pendingLabel: 'Chờ lấy',
    pendingShortLabel: 'Chờ',
    processingLabel: 'Đang lấy',
    processingShortLabel: 'Lấy',
    readyLabel: 'Đã lấy',
    readyShortLabel: 'Xong',
    desktopPendingTitle: 'Chờ lấy hàng',
    desktopProcessingTitle: 'Đang lấy',
    desktopReadyTitle: 'Đã lấy xong',
    desktopCancelledTitle: 'Mục đã hủy',
    startAction: 'Bắt đầu lấy',
    retryAction: 'Lấy lại',
    completeAction: 'Đã lấy',
    priorityText: 'Ưu tiên lấy hàng',
  },
});

export function normalizeProductionStation(station) {
  return PRODUCTION_STATION_LABELS[station] ? station : DEFAULT_PRODUCTION_STATION;
}

export function getProductionStationLabel(station) {
  return PRODUCTION_STATION_LABELS[normalizeProductionStation(station)];
}

export function getProductionStationCopy(station) {
  return KITCHEN_STATION_COPY[normalizeProductionStation(station)] || KITCHEN_STATION_COPY.KITCHEN;
}