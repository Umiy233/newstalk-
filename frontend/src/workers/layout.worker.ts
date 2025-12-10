// Define minimal interface to avoid complex imports in worker if not fully configured
interface WorkerFeedItem {
  id: string;
  title: string;
  lastImageWidth?: number;
  lastImageHeight?: number;
  [key: string]: any;
}

interface WorkerMessage {
  items: WorkerFeedItem[];
  reset: boolean;
  currentLeftHeight: number;
  currentRightHeight: number;
}

interface WorkerResponse {
  leftCol: WorkerFeedItem[];
  rightCol: WorkerFeedItem[];
  leftHeight: number;
  rightHeight: number;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { items, reset, currentLeftHeight, currentRightHeight } = e.data;

  let leftHeight = reset ? 0 : currentLeftHeight;
  let rightHeight = reset ? 0 : currentRightHeight;
  const leftCol: WorkerFeedItem[] = [];
  const rightCol: WorkerFeedItem[] = [];

  items.forEach(item => {
    // Logic from Feed.vue
    let ratio = 1.33;
    if (item.lastImageWidth && item.lastImageHeight) {
      ratio = item.lastImageHeight / item.lastImageWidth;
      // Constrain aspect ratio
      ratio = Math.max(0.75, Math.min(ratio, 1.6));
    }
    
    const contentHeightUnit = 0.6; 
    const totalItemHeight = ratio + contentHeightUnit;

    if (leftHeight <= rightHeight) {
      leftCol.push(item);
      leftHeight += totalItemHeight;
    } else {
      rightCol.push(item);
      rightHeight += totalItemHeight;
    }
  });

  const response: WorkerResponse = {
    leftCol,
    rightCol,
    leftHeight,
    rightHeight
  };

  self.postMessage(response);
};

