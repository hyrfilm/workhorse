import { TaskState } from '@types';
import { Task, VizMessage, VIZ_CHANNEL } from './QueueVisualizer.ts';

interface QueueVisualizerHandle {
  destroy(): void;
}

export function initQueueVisualizer(options?: { parent?: HTMLElement }): QueueVisualizerHandle {
  const urlParams = new URLSearchParams(window.location.search);
  const parent = options?.parent ?? document.body;
  // Root container
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '100vw';
  container.style.height = '50vh';
  container.style.background = '#000';
  if (!urlParams.get('viz')) {
    container.style.display = 'none';
  }
  parent.prepend(container);

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight / 2;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context not supported');
  }

  // Bottom-left info overlay
  const info = document.createElement('div');
  info.style.position = 'absolute';
  info.style.left = '1rem';
  info.style.bottom = '1rem';
  info.style.fontFamily = 'monospace';
  info.style.fontSize = '10px';
  info.style.color = '#22d3ee'; // similar to text-cyan-400
  info.style.lineHeight = '1.4';
  info.style.pointerEvents = 'none';

  const title = document.createElement('div');
  title.style.color = '#6b7280'; // gray-500
  title.textContent = 'MatrixViz';

  info.appendChild(title);
  container.appendChild(info);

  // State
  let tasks: Task[] = [];

  const COLS = 24 * 2;
  const ROWS = 18 * 2;
  const PADDING = 40;

  let cellSize = (canvas.width - PADDING * 2) / COLS;
  let circleRadius = cellSize * 0.35;

  const recomputeLayout = () => {
    cellSize = (canvas.width - PADDING * 2) / COLS;
    circleRadius = cellSize * 0.35;
  };

  const getTaskPosition = (index: number) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const x = PADDING + col * cellSize + cellSize / 2;
    const y = PADDING + row * cellSize + cellSize / 2;
    return { x, y, row, col };
  };

  const drawCircle = (
    x: number,
    y: number,
    radius: number,
    color: string,
    rotation = 0,
    isProcessing = false
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Outer circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner dial indicator
    if (isProcessing || rotation !== 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -radius * 0.7);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // BroadcastChannel: listen for task updates and request initial state
  const bc = new BroadcastChannel(VIZ_CHANNEL);
  bc.onmessage = (event: MessageEvent<VizMessage>) => {
    if (event.data.type === 'tasks') {
      tasks = event.data.tasks;
    }
  };
  const stateRequest: VizMessage = { type: 'state:request' };
  bc.postMessage(stateRequest);

  let animationId = 0;

  const animate = (now: number) => {
    // Clear canvas
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(PADDING + i * cellSize, PADDING);
      ctx.lineTo(PADDING + i * cellSize, canvas.height - PADDING);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(PADDING, PADDING + i * cellSize);
      ctx.lineTo(canvas.width - PADDING, PADDING + i * cellSize);
      ctx.stroke();
    }

    // Draw tasks
    const dialRotation = ((now / 1000) * Math.PI * 2) % (Math.PI * 2);
    const stats = { executing: 0, successful: 0, failed: 0 };
    for (let i = 0; i < tasks.length; i++) {
      const pos = getTaskPosition(i);

      switch (tasks[i].status) {
        case TaskState.queued:
          drawCircle(pos.x, pos.y, circleRadius, '#00d4ff', 0, false);
          break;
        case TaskState.executing:
          stats.executing++;
          drawCircle(pos.x, pos.y, circleRadius, '#ffaa00', dialRotation, true);
          break;
        case TaskState.successful:
          stats.successful++;
          drawCircle(pos.x, pos.y, circleRadius, '#00ff88', 0, true);
          break;
        case TaskState.failed:
          stats.failed++;
          drawCircle(pos.x, pos.y, circleRadius, '#ff3366', 0, true);
          break;
        default:
      }
    }

    // Stats labels
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText(`Added: ${tasks.length}`, canvas.width - 20, canvas.height - 90);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`Executing: ${stats.executing}`, canvas.width - 20, canvas.height - 70);
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`Completed: ${stats.successful}`, canvas.width - 20, canvas.height - 50);
    ctx.fillStyle = '#ff3366';
    ctx.fillText(`Failed: ${stats.failed}`, canvas.width - 20, canvas.height - 30);

    // Row/Col indicators
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i < ROWS; i++) {
      ctx.fillText(i.toString(), PADDING - 10, PADDING + i * cellSize + cellSize / 2 + 4);
    }
    ctx.textAlign = 'center';
    for (let i = 0; i < COLS; i++) {
      ctx.fillText(i.toString(), PADDING + i * cellSize + cellSize / 2, PADDING - 10);
    }

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  // Handle resize
  const handleResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    recomputeLayout();
  };

  window.addEventListener('resize', handleResize);

  return {
    destroy() {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      bc.close();
      parent.removeChild(container);
    },
  };
}
