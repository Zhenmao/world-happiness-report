(function() {
  let countries;
  let scores;

  const scoreThresholds = [4, 5, 6, 7];

  const scoreColors = ['#d0587e', '#db8b95', '#e5b9ad', '#74ada2', '#009392'];

  const mapColorScale = d3.scaleThreshold()
    .domain(scoreThresholds)
    .range(scoreColors);

  Promise.all([
    d3.json('countries.json'),
    d3.csv('whr2018scores.csv')
  ]).then(([json, csv]) => {
    countries = json;
    csv.forEach(d => {
      csv.columns.forEach(column => {
        if (column === 'Country') return;
        d[column] = +d[column];
      });
    });
    scores = d3.map(csv, d => d.Country);
    console.log(json);
    console.log(csv);
    renderMap();
  });

  function renderMap() {
    const map = L.map('map').setView([40, 0], 2);
    const geojson = L.geoJson(countries, { 
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = drawLegend;
    legend.addTo(map);

    function style(feature) {
      const country = scores.get(feature.properties.name);
      return {
        fillColor: country ? mapColorScale(country['Happiness score']) : '#ddd',
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

    function highlightFeature(e) {
      const layer = e.target;
      layer.setStyle({
        color: '#666'
      });

      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    }

    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: zoomToFeature
      });
    }
  }

})();