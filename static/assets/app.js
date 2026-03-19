/**
 * SARFBAIDA — Données des taux depuis l'API (dynamique)
 * API: OpenSheet (Google Sheet)
 */
(function () {
  'use strict';

  var API_RATES =
    'https://opensheet.elk.sh/1k2OLUjlJl5TLOOiKEvNU8leUWUC0DzJGZGCR2_UkKhg/Feuille%201';

  var FLAGS = {
    EUR: '🇪🇺',
    USD: '🇺🇸',
    CAD: '🇨🇦',
    GBP: '🇬🇧',
    CHF: '🇨🇭',
    SAR: '🇸🇦',
    AED: '🇦🇪',
    BHD: '🇧🇭',
    KWD: '🇰🇼',
    QAR: '🇶🇦',
    OMR: '🇴🇲'
  };

  function getFlag(code) {
    return FLAGS[code] || '💱';
  }

  /**
   * Récupère les taux depuis l'API
   * @returns {Promise<Array<{devise:string, code:string, achat:string, vente:string}>>}
   */
  function fetchRates() {
    return fetch(API_RATES)
      .then(function (res) {
        if (!res.ok) throw new Error('API rates failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data) ? data : [];
      });
  }

  /**
   * Remplit le ticker (cours du jour)
   * @param {Array} data
   */
  function renderTicker(data) {
    var track = document.getElementById('tickerTrack');
    if (!track || !data.length) return;

    function itemHtml(row) {
      return (
        '<span class="ticker-item">' +
        '<span class="t-pair">' + row.code + '/MAD</span> ' +
        '<span class="t-buy">A:' + row.achat + '</span> ' +
        '<span class="t-sell">V:' + row.vente + '</span>' +
        '</span>'
      );
    }

    var html = data.map(itemHtml).join('\n            ');
    track.innerHTML = html + '\n            ' + html; // duplicate for infinite scroll
  }

  /**
   * Remplit la grille des cartes (hero rates board)
   * @param {Array} data
   */
  function renderRateCards(data) {
    var grid = document.getElementById('ratesCardsGrid');
    if (!grid || !data.length) return;

    var html = data
      .map(function (row) {
        var flag = getFlag(row.code);
        return (
          '<div class="rate-card">' +
          '<div class="rc-top"><span class="rc-flag">' + flag + '</span><div><div class="rc-code">' + row.code + '</div><div class="rc-name">' + row.devise + '</div></div></div>' +
          '<div class="rc-rates">' +
          '<div class="rc-rate buy"><span class="lbl">Achat</span><span class="val">' + row.achat + '</span></div>' +
          '<div class="rc-rate sell"><span class="lbl">Vente</span><span class="val">' + row.vente + '</span></div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    grid.innerHTML = html;
  }

  /**
   * Remplit le tableau des cours (section tableau complet)
   * @param {Array} data
   */
  function renderRatesTable(data) {
    var tbody = document.getElementById('ratesTableBody');
    if (!tbody || !data.length) return;

    var html = data
      .map(function (row) {
        var flag = getFlag(row.code);
        return (
          '<tr>' +
          '<td><div class="currency-cell"><span class="currency-flag">' + flag + '</span><div class="currency-info"><div class="c-name">' + escapeHtml(row.devise) + '</div><div class="c-code">' + row.code + '</div></div></div></td>' +
          '<td><span class="rate-badge badge-buy">' + row.code + '</span></td>' +
          '<td><span class="rate-buy">' + row.achat + '</span></td>' +
          '<td><span class="rate-sell">' + row.vente + '</span></td>' +
          '</tr>'
        );
      })
      .join('');

    tbody.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Remplit le select devise du calculateur + mini-rates sidebar
   * @param {Array} data
   */
  function renderCalculatorSelect(data) {
    var select = document.getElementById('devise');
    if (!select || !data.length) return;
    var first = select.options[0];
    select.innerHTML = '';
    if (first) select.appendChild(first);
    data.forEach(function (row) {
      var opt = document.createElement('option');
      opt.value = row.code;
      opt.textContent = getFlag(row.code) + '  ' + row.devise + ' (' + row.code + ')';
      select.appendChild(opt);
    });
  }

  /**
   * Remplit la mini-rates card (calculateur sidebar)
   * @param {Array} data
   */
  function renderMiniRates(data) {
    var container = document.getElementById('miniRatesList');
    if (!container || !data.length) return;
    var legend = container.nextElementSibling;
    var html = data
      .map(function (row) {
        var flag = getFlag(row.code);
        return (
          '<div class="mini-rate-row" data-code="' + escapeHtml(row.code) + '">' +
          '<div class="mrr-pair"><span class="mrr-flag">' + flag + '</span><span class="mrr-code">' + row.code + '</span></div>' +
          '<span class="mrr-buy">' + row.achat + '</span><span class="mrr-sell">' + row.vente + '</span>' +
          '</div>'
        );
      })
      .join('');
    container.innerHTML = html;
    if (typeof window.sarfbaidaBindMiniRates === 'function') window.sarfbaidaBindMiniRates();
  }

  /**
   * Initialisation: fetch + rendu partout où les éléments existent
   */
  function init() {
    fetchRates()
      .then(function (data) {
        window.sarfbaidaRates = data;
        renderTicker(data);
        renderRateCards(data);
        renderRatesTable(data);
        renderCalculatorSelect(data);
        renderMiniRates(data);
        window.dispatchEvent(new CustomEvent('sarfbaidaRatesReady', { detail: data }));
      })
      .catch(function (err) {
        console.error('SARFBAIDA rates:', err);
        window.sarfbaidaRates = [];
        var track = document.getElementById('tickerTrack');
        if (track) track.innerHTML = '<span class="ticker-item"><span class="t-pair">—</span> <span class="t-buy">Cours indisponibles</span></span>';
        window.dispatchEvent(new CustomEvent('sarfbaidaRatesReady', { detail: [] }));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
