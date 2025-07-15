const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let bgImage = new Image();
let points = [];
let shapes = [];

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
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  points.push({ x, y });
  draw();
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