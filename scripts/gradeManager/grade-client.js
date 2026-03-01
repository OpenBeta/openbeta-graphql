let allData = null;
const pxPerPeg = 1;
const gradeColors = [
  '#fad390',
  '#f6b93b',
  '#fa983a',
  '#e58e26',
  '#f8c291',
  '#e55039',
  '#eb2f06',
  '#b71540',
  '#6a89cc',
  '#4a69bd',
  '#1e3799',
  '#0c2461',
  '#82ccdd',
  '#60a3bc',
  '#3c6382',
  '#0a3d62',
  '#b8e994',
  '#78e08f',
  '#38ada9',
  '#079992',
];

async function loadData() {
  const res = await fetch('/api/grades');
  allData = await res.json();

  populateDisciplines(allData.disciplines);
  renderApp();
}

function populateDisciplines(disciplines) {
  const select = document.getElementById('discipline-select');
  const urlParams = new URLSearchParams(window.location.search);
  const disciplineParam = urlParams.get('discipline');

  disciplines?.forEach((d) => {
    const option = document.createElement('option');
    option.value = d;
    option.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    select.appendChild(option);
  });

  if (
    disciplineParam
    && [...select.options].some((opt) => opt.value === disciplineParam)
  ) {
    select.value = disciplineParam;
  }

  select.addEventListener('change', () => {
    const url = new URL(window.location);
    url.searchParams.set('discipline', select.value);
    window.history.pushState({}, '', url);
    renderApp();
  });
}

function renderApp() {
  const disciplineFilter = document.getElementById('discipline-select').value;
  const { systems, grades, pegs } = allData;
  const app = document.getElementById('app');
  app.innerHTML = '';

  const filteredSystems = disciplineFilter === 'all'
    ? systems
    : systems.filter((s) => s.discipline === disciplineFilter);

  if (filteredSystems.length === 0) {
    app.innerHTML = '<p>No grade systems found for this discipline.</p>';
    return;
  }

  const gradeTableElement = document.createElement('div');
  gradeTableElement.id = 'grade-table';
  gradeTableElement.classList.add('table');

  filteredSystems.forEach((system, sysIdx) => {
    const column = document.createElement('div');
    column.classList.add('table-column');
    column.dataset.systemId = system.id;
    const header = document.createElement('div');

    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `<b>${system.name}</b>`;

    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    plusBtn.style.marginLeft = '10px';
    plusBtn.style.cursor = 'pointer';
    plusBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const gradeElements = column.getElementsByClassName('grade');
      for (let i = 0; i < gradeElements.length; i++) {
        const gradeEl = gradeElements[i];
        const currentHeight = parseFloat(gradeEl.style.height) || 0;
        if (currentHeight > 0) {
          gradeEl.style.height = `${currentHeight * 1.2}px`;
        } else {
          gradeEl.style.height = '40px';
        }
      }
    });
    header.appendChild(plusBtn);
    column.appendChild(header);

    const systemGrades = grades.filter((g) => g.system == system.id);
    systemGrades.forEach((grade, idx) => {
      const nextGrade = systemGrades[idx + 1];

      const gradeElement = document.createElement('div');
      gradeElement.id = grade.id;
      gradeElement.classList.add('grade');
      gradeElement.innerHTML = `<div>${grade.value}</div>`;

      // Add drag handles
      const topHandle = document.createElement('div');
      topHandle.classList.add('drag-handle', 'drag-handle-top');
      const bottomHandle = document.createElement('div');
      bottomHandle.classList.add('drag-handle', 'drag-handle-bottom');

      gradeElement.appendChild(topHandle);
      gradeElement.appendChild(bottomHandle);

      const pegLow = grade.pegValueLow ?? grade.pegValueLower ?? 0;
      const nextPegLow = nextGrade
        ? (nextGrade.pegValueLow ?? nextGrade.pegValueLower)
        : pegLow + 1;
      const pegSpan = nextPegLow - pegLow;
      gradeElement.style.height = `${pegSpan * pxPerPeg}px`;

      if (idx === systemGrades.length - 1) {
        gradeElement.style.flexGrow = '1';
      }

      // Drag logic
      const handleDrag = (e, isBottom) => {
        e.preventDefault();
        const startY = e.pageY;
        const startHeight = parseFloat(gradeElement.style.height);

        const onMouseMove = (moveEvent) => {
          const deltaY = moveEvent.pageY - startY;
          const newHeight = isBottom
            ? startHeight + deltaY
            : startHeight - deltaY;

          if (newHeight > pxPerPeg * 0.5) {
            gradeElement.style.height = `${newHeight}px`;
          }
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          gradeElement.classList.remove('dragging');
          // Call update lower peg value
          gradeElement.id;
          colorColumns();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        gradeElement.classList.add('dragging');
      };

      topHandle.addEventListener('mousedown', (e) => handleDrag(e, false));
      bottomHandle.addEventListener('mousedown', (e) => handleDrag(e, true));

      column.appendChild(gradeElement);
    });

    gradeTableElement.appendChild(column);
    setTimeout(colorColumns, 100);
  });

  app.appendChild(gradeTableElement);
}

loadData();

document.getElementById('save-btn').addEventListener('click', async () => {
  const data = [];
  const columns = document.querySelectorAll('.table-column');

  columns.forEach((column) => {
    const systemId = column.dataset.systemId;
    if (!systemId) return;

    let currentPeg = 0;
    const gradeEls = column.querySelectorAll('.grade');

    gradeEls.forEach((gradeEl) => {
      const gradeId = parseInt(gradeEl.id);
      const rect = gradeEl.getBoundingClientRect();
      const height = rect.height;
      const pegSpan = Math.round(height / pxPerPeg);

      data.push({
        id: gradeId,
        systemId: parseInt(systemId),
        pegValueLow: currentPeg,
      });

      currentPeg += pegSpan;
    });
  });

  const res = await fetch('/api/grades/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    alert('Changes saved successfully!');
    loadData();
  } else {
    alert('Failed to save changes.');
  }
});

function colorColumns() {
  for (const column of document.getElementById('grade-table').childNodes) {
    for (const child of column.childNodes) {
      if (!child.id) continue;
      const color = gradeColors[
        (child
          .getBoundingClientRect()
          .top / 100)
          .toFixed() % gradeColors.length
      ];
      child.style.background = color;
      child.style.color = isDarkColor(color) ? 'white' : 'black';
    }
  }
}

function isDarkColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // HSP equation for perceived brightness
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp < 127.5;
}
