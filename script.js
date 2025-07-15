const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let bgImage = new Image();
let points = [];
let shapes = [];
let moveDotsMode = false;
let draggingPointIndex = null;
let snapToGrid = false;
let gridSize = 20; // Grid spacing in pixels
let robotSimulation = false;
let robotPosition = { x: 0, y: 0 };
let robotProgress = 0;
let robotAnimationId = null;
let robotSpeed = 0.005; // How fast the robot moves along the path

function toggleSnapToGrid() {
  snapToGrid = !snapToGrid;
  document.getElementById('snapToGridBtn').classList.toggle('active', snapToGrid);
  draw();
}

function snapToGridPoint(x, y) {
  if (!snapToGrid) return { x, y };
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

function drawGrid() {
  if (!snapToGrid) return;
  
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

function toggleRobotSimulation() {
  robotSimulation = !robotSimulation;
  const btn = document.getElementById('startRobotBtn');
  
  if (robotSimulation) {
    if (points.length < 4) {
      alert('Need at least 4 points to simulate robot path!');
      robotSimulation = false;
      return;
    }
    btn.textContent = 'Stop Robot';
    btn.classList.add('active');
    robotProgress = 0;
    startRobotAnimation();
  } else {
    btn.textContent = 'Start Robot';
    btn.classList.remove('active');
    stopRobotAnimation();
  }
}

function startRobotAnimation() {
  function animate() {
    if (!robotSimulation) return;
    
    robotProgress += robotSpeed;
    
    // Calculate robot position along the path
    if (points.length >= 4) {
      const totalSegments = points.length - 3;
      const currentSegment = Math.floor(robotProgress * totalSegments);
      const localT = (robotProgress * totalSegments) - currentSegment;
      
      if (currentSegment >= totalSegments) {
        // Robot reached the end, restart
        robotProgress = 0;
      } else {
        const segmentIndex = currentSegment + 1; // Offset for Catmull-Rom
        const p0 = points[segmentIndex - 1];
        const p1 = points[segmentIndex];
        const p2 = points[segmentIndex + 1];
        const p3 = points[segmentIndex + 2];
        
        robotPosition.x = catmullRom(p0.x, p1.x, p2.x, p3.x, localT);
        robotPosition.y = catmullRom(p0.y, p1.y, p2.y, p3.y, localT);
      }
    }
    
    draw();
    robotAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function stopRobotAnimation() {
  if (robotAnimationId) {
    cancelAnimationFrame(robotAnimationId);
    robotAnimationId = null;
  }
  draw(); // Redraw without robot
}

function drawRobot() {
  if (!robotSimulation || points.length < 4) return;
  
  // Draw robot as a blue circle with direction indicator
  ctx.fillStyle = '#1e90ff';
  ctx.beginPath();
  ctx.arc(robotPosition.x, robotPosition.y, 8, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw robot border
  ctx.strokeStyle = '#000080';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw direction indicator (small white dot)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(robotPosition.x, robotPosition.y, 3, 0, 2 * Math.PI);
  ctx.fill();
}

function toggleMoveDotsMode() {
  moveDotsMode = !moveDotsMode;
  document.getElementById('moveDotsBtn').classList.toggle('active', moveDotsMode);
  if (!moveDotsMode) draggingPointIndex = null;
}

document.getElementById('bgUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    bgImage.onload = () => draw();
    bgImage.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('click', function (e) {
  if (moveDotsMode) return; // Don't add points in move mode
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const snappedPoint = snapToGridPoint(x, y);
  points.push(snappedPoint);
  draw();
});

canvas.addEventListener('mousedown', function (e) {
  if (!moveDotsMode) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (Math.hypot(p.x - x, p.y - y) < 8) {
      draggingPointIndex = i;
      break;
    }
  }
});

canvas.addEventListener('mousemove', function (e) {
  if (!moveDotsMode || draggingPointIndex === null) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const snappedPoint = snapToGridPoint(x, y);
  points[draggingPointIndex] = snappedPoint;
  draw();
});

canvas.addEventListener('mouseup', function () {
  if (!moveDotsMode) return;
  draggingPointIndex = null;
});

function clearPoints() {
  points = [];
  shapes = [];
  draw();
}

function undobutton() {
  points.pop();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgImage.src) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  
  // Draw grid if snap to grid is enabled
  drawGrid();

  for (const shape of shapes) {
    ctx.fillStyle = shape.color;
    if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
      ctx.fill();
    } else if (shape.type === 'rect') {
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x + shape.size, shape.y);
      ctx.lineTo(shape.x + shape.size / 2, shape.y - shape.size);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = '#dc143c';
  for (let p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (points.length >= 4) {
    ctx.strokeStyle = '#4169e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2];
      for (let t = 0; t <= 1; t += 0.02) {
        const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
        const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        if (t === 0 && i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  // Draw robot if simulation is active
  drawRobot();
}

function catmullRom(p0, p1, p2, p3, t) {
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function exportPathCSV() {
  if (points.length < 4) return;

  let csv = 'x,y\n';
  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2];
    for (let t = 0; t <= 1; t += 0.02) {
      const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
      const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
      csv += `${x.toFixed(2)},${y.toFixed(2)}\n`;
    }
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spline_path.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function addRandomShape() {
  const shapeTypes = ['circle', 'rect', 'triangle'];
  const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  const color = `hsl(${Math.random() * 360}, 70%, 60%)`;

  if (type === 'circle') {
    shapes.push({ type, x, y, r: 10 + Math.random() * 30, color });
  } else if (type === 'rect') {
    shapes.push({ type, x, y, w: 20 + Math.random() * 40, h: 20 + Math.random() * 40, color });
  } else if (type === 'triangle') {
    shapes.push({ type, x, y, size: 30 + Math.random() * 30, color });
  }

  draw();
}
