const data = document.querySelector('#circuit-data');
const list = document.querySelector('#tracks');
const search = document.querySelector('#track-search');
const count = document.querySelector('#count');
const noResults = document.querySelector('#no-results');

if (data && list && search && count && noResults) {
  const circuits = JSON.parse(data.textContent);

  function render() {
    const query = search.value.trim().toLowerCase();
    const rows = circuits
      .map((name, index) => ({ name, number: String(index + 1).padStart(2, '0') }))
      .filter(({ name }) => name.toLowerCase().includes(query))
      .map(({ name, number }) => {
        const row = document.createElement('div');
        row.className = 'track';
        const num = document.createElement('span');
        num.textContent = number;
        row.append(num, document.createTextNode(name));
        return row;
      });
    list.replaceChildren(...rows);
    count.textContent = rows.length + (rows.length === 1 ? ' circuit' : ' circuits');
    noResults.hidden = rows.length > 0;
  }

  search.addEventListener('input', render);
  render();
}
