(function() {
  let countries;
  let scores;
  let scoresMap;

  let geojsonLayer;
  let scrollContainer;
  let infoBox;

  const countryColWidth = 160;
  const scoreColWidth = 50;
  const tableRowHeight = 30;
  const factorBarHeight = 20;
  let factorColWidth;

  const scoreThresholds = [4, 5, 6, 7];
  const scoreColors = ['#d0587e', '#db8b95', '#e5b9ad', '#74ada2', '#009392'];
  const factorColors = ['#f3cbd3', '#eaa9bd', '#dd88ac', '#ca699d', '#b14d8e', '#91357d', '#6c2167'].reverse();

  const tableColNames = ['Country', 'Score', 'Factor'];
  const factors = ["Explained by: GDP per capita", "Explained by: Social support", "Explained by: Healthy life expectancy", "Explained by: Freedom to make life choices", "Explained by: Generosity", "Explained by: Perceptions of corruption", "Dystopia (1.92) + residual"];

  const mapColorScale = d3.scaleThreshold()
    .domain(scoreThresholds)
    .range(scoreColors);

  const tableColorScale = d3.scaleOrdinal()
    .domain(factors)
    .range(factorColors);

  const tableColScale = d3.scaleOrdinal()
    .domain(tableColNames);

  const tableFactorScale = d3.scaleLinear()
    .domain([0, 8]);

  Promise.all([
    d3.json('countries.json'),
    d3.csv('whr2018scores.csv')
  ]).then(([json, csv]) => {
    csv.forEach((d, i) => {
      csv.columns.forEach(column => {
        if (column === 'Country') return;
        d[column] = +d[column];
      });
      d.Rank = i + 1;
    });
    scores = csv;
    scoresMap = d3.map(csv, d => d.Country);

    countries = json;
    countries.features.forEach(el => {
      const country = scoresMap.get(el.properties.name);
      if (country) {
        el.properties.score = country['Happiness score']
      }
    });

    renderMap();
    renderTable();
    updateInfo();
  });

  function renderMap() {
    const map = L.map('map', {
      scrollWheelZoom: false
    }).setView([40, 0], 2);
    geojsonLayer = L.geoJson(countries, { 
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = drawLegend;
    legend.addTo(map);

    const info = L.control({ position: 'bottomleft' });
    info.onAdd = () => L.DomUtil.create('div', 'map-info');
    info.addTo(map);
    infoBox = document.getElementsByClassName('map-info')[0];

    function style(feature) {
      const score = feature.properties.score;
      return {
        fillColor: score ? mapColorScale(score) : '#ddd',
        weight: 1,
        color: '#fff',
        fillOpacity: 0.7
      };
    }

    function drawLegend() {
      const div = d3.create('div').attr('class', 'map-legend');

      // Legend title
      div.append('div').attr('class', 'legend-title')
        .text('Happiness score');

      // Legend scale
      const legendLi = div.append('div').attr('class', 'legend-scale')
        .append('ul').attr('class', 'legend-labels')
        .selectAll('li')
        .data(scoreColors)
        .enter().append('li');
      legendLi.append('span')
          .style('background-color', d => d)
          .style('opacity', 0.7);
      legendLi.append('span').text((d, i) => {
        if (i === 0) {
          return '<' + scoreThresholds[0];
        } else if (i === scoreColors.length - 1) {
          return '>' + scoreThresholds[scoreColors.length - 2];
        } else {
          return scoreThresholds[i - 1] + '-' + scoreThresholds[i];
        }
      });

      return div.node();
    }

    function onEachFeature(feature, layer) {
      if (!feature.properties.score) return;
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
      });
    }
  }

  function renderTable() {
    const tableWidth = document.getElementById('table').clientWidth;
    factorColWidth = tableWidth - countryColWidth - scoreColWidth - 20;

    tableColScale.range([countryColWidth, scoreColWidth, factorColWidth]);
    tableFactorScale.range([0, factorColWidth]);

    const table = d3.select('#table');

    // Remove pervious rendering
    table.selectAll('*').remove();

    // Table headers
    table.append('thead').append('tr')
      .selectAll('th')
      .data(tableColNames)
      .enter().append('th')
      .style('width', d => tableColScale(d) + 'px')
      .text(d => d);

    // Table body
    const tr = table.append('tbody')
      .selectAll('tr')
      .data(scores)
      .enter().append('tr')
      .style('height', tableRowHeight + 'px');

    // Country name column
    tr.append('td')
      .attr('class', 'country-label')
      .style('width', countryColWidth + 'px')
      .text(d => d.Country);

    // Score column
    tr.append('td')
      .attr('class', 'country-score')
      .style('width', scoreColWidth + 'px')
      .text(d => d['Happiness score']);

    // Factor column
    tr.append('td')
      .attr('class', 'country-factor')
      .style('width', factorColWidth + 'px')
      .append('div')
      .attr('class', 'factor-wrapper')
      .style('width', factorColWidth + 'px')
      .style('height', factorBarHeight + 'px')
      .selectAll('.factor-bar')
      .data(d => factors.map(factor => ({
        factor: factor,
        value: d[factor]
      })))
      .enter().append('div')
      .attr('class', 'factor-bar')
      .style('background-color', d => tableColorScale(d.factor))
      .style('width', d => tableFactorScale(d.value) + 'px')
      .style('height', factorBarHeight + 'px');

    scrollContainer = table.select('tbody');
    
  }

  function highlightFeature(e) {
    // Highlight
    const layer = e.target;
    layer.setStyle({
      color: '#666'
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }

    const country = layer.feature.properties.name;
    // Scroll
    scrollToRow(country);

    // Update info
    updateInfo(country);
  }

  function resetHighlight(e) {
    // Reset highlight
    geojsonLayer.resetStyle(e.target);

    // Update info
    updateInfo();
  }

  function scrollToRow(country) {
    const countryIndex = scores.findIndex(d => d.Country === country);
    if (countryIndex === -1) return;
    const scrollTop = countryIndex * tableRowHeight;
    scrollContainer
      .transition()
      .duration(1000)
      .tween("scrollTop", scrollTopTween(scrollTop));
  }

  function updateInfo(country) {
    if (!country) {
      infoBox.innerHTML = '<b>Hover over a country</b><br>Score: <br>Rank: ';
    } else {
      const d = scoresMap.get(country);
      infoBox.innerHTML = `<b>${d.Country}</b><br>Score: <b>${d['Happiness score']}</b><br>Rank: <b>${d.Rank}</b>`;
    }
  }

  function scrollTopTween(scrollTop) {
    return function() {
      const i = d3.interpolateNumber(this.scrollTop, scrollTop);
      const node = this;
      return function (t) { node.scrollTop = i(t); };
    };
  }

})();