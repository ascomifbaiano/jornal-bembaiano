document.addEventListener('DOMContentLoaded', () => {
    initDateInfo();
    initA11y();
    initLGPD();
    setupFilters();
    loadNewsData('data/geral_recentes.csv', true);
});

let currentData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let currentCategory = 'todas';
let showingSavedOnly = false;

// --- Data por Extenso ---
function initDateInfo() {
    const dateElement = document.getElementById('current-date-str');
    if (!dateElement) return;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayStr = new Date().toLocaleDateString('pt-BR', options);
    // Capitalize first letter
    const formatted = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
    dateElement.textContent = `📅 ${formatted}`;
}

// --- Acessibilidade ---
function initA11y() {
    const btnContrast = document.getElementById('btn-contrast');
    const btnIncrease = document.getElementById('btn-font-increase');
    const btnDecrease = document.getElementById('btn-font-decrease');
    let currentFontSize = 16;

    if (btnContrast) {
        btnContrast.addEventListener('click', () => document.body.classList.toggle('high-contrast'));
    }
    if (btnIncrease) {
        btnIncrease.addEventListener('click', () => {
            if (currentFontSize < 24) {
                currentFontSize += 2;
                document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
            }
        });
    }
    if (btnDecrease) {
        btnDecrease.addEventListener('click', () => {
            if (currentFontSize > 12) {
                currentFontSize -= 2;
                document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
            }
        });
    }
}

// --- LGPD Banner ---
function initLGPD() {
    const banner = document.getElementById('cookie-banner');
    const btnAccept = document.getElementById('btn-accept-cookies');
    if (banner && !localStorage.getItem('lgpd_consent')) {
        banner.hidden = false;
    }
    if (btnAccept) {
        btnAccept.addEventListener('click', () => {
            localStorage.setItem('lgpd_consent', 'true');
            if (banner) banner.hidden = true;
        });
    }
}

// --- Classificador de Categorias (Regex) ---
function getTags(titulo) {
    const t = titulo.toLowerCase();
    let tag = 'Institucional';
    let tagClass = 'tag-inst';
    
    if (/(edital|seleção|selecao|inscrições|inscricoes|vagas|processo seletivo|chamada)/.test(t)) {
        tag = 'Editais e Seleções';
        tagClass = 'tag-edital';
    } else if (/(simposio|simpósio|workshop|seminário|seminario|festival|famif|cepex|evento|palestra)/.test(t)) {
        tag = 'Eventos';
        tagClass = 'tag-evento';
    } else if (/(resultado|homologação|homologacao|convocação|convocacao)/.test(t)) {
        tag = 'Resultados';
        tagClass = 'tag-resultado';
    }
    return { name: tag, cssClass: tagClass };
}

// --- Tempo Estimado de Leitura ---
function calcReadTime(texto) {
    if (!texto) return 1;
    const words = texto.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 40));
}

// --- CSV Parser ---
function csvToJson(csvText) {
    const lines = csvText.trim().split('\n');
    const result = [];
    if (lines.length < 2) return result;
    
    const headers = lines[0].split(',').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentline = lines[i];
        let inQuotes = false;
        let value = '';
        let colIndex = 0;
        
        for (let char of currentline) {
            if (char === '"' && inQuotes) {
                inQuotes = false;
            } else if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === ',' && !inQuotes) {
                obj[headers[colIndex]] = value.trim();
                value = '';
                colIndex++;
            } else {
                value += char;
            }
        }
        if (headers[colIndex]) {
            obj[headers[colIndex]] = value.trim();
        }
        result.push(obj);
    }
    return result;
}

// --- Controle de Loading ---
function showLoader(show) {
    const loader = document.getElementById('if-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// --- Favoritos (LocalStorage) ---
function getSavedLinks() {
    return JSON.parse(localStorage.getItem('saved_news_links') || '[]');
}

def_toggle_save = function(link) {
    let saved = getSavedLinks();
    if (saved.includes(link)) {
        saved = saved.filter(l => l !== link);
    } else {
        saved.push(link);
    }
    localStorage.setItem('saved_news_links', JSON.stringify(saved));
    applyFiltersAndRender();
};

// --- Carregamento de Dados ---
async function loadNewsData(csvPath, isHome = false) {
    showLoader(true);
    try {
        const response = await fetch(csvPath);
        if (!response.ok) throw new Error('Dados não encontrados');
        
        const csvText = await response.text();
        let newsData = csvToJson(csvText);
        
        newsData = newsData.filter(item => item.titulo && item.titulo !== '');
        
        newsData = newsData.map(item => {
            item.tag = getTags(item.titulo);
            item.tempo_leitura = calcReadTime(item.titulo + ' ' + (item.resumo || ''));
            return item;
        });

        currentData = newsData;
        currentPage = 1;

        // Render Breaking News Ticker
        renderTicker(newsData.slice(0, 5));
        
        if (isHome && newsData.length > 0) {
            const reitoriaNews = newsData.find(n => n.campus === 'Reitoria');
            const destaque = reitoriaNews ? reitoriaNews : newsData[0];
            renderHero(destaque);
            currentData = currentData.filter(n => n !== destaque);
        } else {
            const heroSection = document.getElementById('hero-section');
            if (heroSection) heroSection.innerHTML = '';
        }
        
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Erro ao carregar:', error);
        const grid = document.getElementById('news-grid');
        if (grid) grid.innerHTML = '<p>Erro ao carregar matérias. Tente novamente mais tarde.</p>';
    } finally {
        showLoader(false);
    }
}

// --- Render Breaking News Ticker ---
function renderTicker(items) {
    const ticker = document.getElementById('breaking-news-ticker');
    if (!ticker || items.length === 0) return;

    const tickerHTML = items.map(item => `
        <a href="${item.link}" target="_blank" rel="noopener">
            <strong>[${item.campus}]</strong> ${item.titulo}
        </a>
    `).join(' &nbsp; | &nbsp; ');

    ticker.innerHTML = tickerHTML;
}

// --- Filtros e Busca ---
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const campusSelect = document.getElementById('campus-select');
    const catLinks = document.querySelectorAll('.cat-link');
    const btnSaved = document.getElementById('btn-show-saved');
    
    // Lista de campi fixa
    const campiList = [
        "Alagoinhas", "Bom Jesus da Lapa", "Catu", "Governador Mangabeira", "Guanambi", 
        "Itaberaba", "Itapetinga", "Reitoria", "Santa Inês", "Senhor do Bonfim", 
        "Serrinha", "Teixeira de Freitas", "Uruçuca", "Valença", "Xique-Xique"
    ];
    
    if (campusSelect) {
        campiList.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = `📍 ${c}`;
            campusSelect.appendChild(opt);
        });

        campusSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if(val === 'todos') {
                loadNewsData('data/geral_recentes.csv', true);
            } else {
                const filename = val.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
                loadNewsData(`data/campi/${filename}.csv`, false);
            }
        });
    }

    const triggerFilter = () => {
        currentPage = 1;
        applyFiltersAndRender();
    };

    if (searchInput) {
        searchInput.addEventListener('input', triggerFilter);
    }
    
    catLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            catLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-cat');
            showingSavedOnly = false;
            if (btnSaved) btnSaved.classList.remove('active');
            triggerFilter();
        });
    });

    if (btnSaved) {
        btnSaved.addEventListener('click', () => {
            showingSavedOnly = !showingSavedOnly;
            btnSaved.classList.toggle('active', showingSavedOnly);
            triggerFilter();
        });
    }
}

function applyFiltersAndRender() {
    const searchInput = document.getElementById('search-input');
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    const savedLinks = getSavedLinks();
    
    let filtered = currentData;
    
    if (showingSavedOnly) {
        filtered = filtered.filter(n => savedLinks.includes(n.link));
    }
    if (term) {
        filtered = filtered.filter(n => n.titulo.toLowerCase().includes(term) || (n.resumo && n.resumo.toLowerCase().includes(term)));
    }
    if (currentCategory !== 'todas') {
        filtered = filtered.filter(n => n.tag.name === currentCategory);
    }
    
    renderGrid(filtered);
}

// --- Renderização do Hero ---
function renderHero(item) {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;
    
    let imageHTML = '';
    if (item.imagem) {
        imageHTML = `<img src="${item.imagem}" alt="${item.titulo}" class="hero-image" loading="lazy">`;
    } else {
        imageHTML = `<div class="img-wrapper-fallback"><img src="./marca-if-baiano-vertical.png" alt="IF Baiano Logo" class="fallback-img" loading="lazy"></div>`;
    }
    
    heroSection.innerHTML = `
        <article class="hero-card">
            <div class="hero-image-container">
                ${imageHTML}
            </div>
            <div class="hero-content">
                <div class="badges">
                    <span class="tag-campus">${item.campus}</span>
                    <span class="tag-cat ${item.tag.cssClass}">${item.tag.name}</span>
                </div>
                <h2><a href="${item.link}" target="_blank" rel="noopener">${item.titulo}</a></h2>
                <p class="hero-excerpt">${item.resumo || ''}</p>
                <div class="meta-info">
                    <span>📅 ${item.data}</span>
                    <span>⏱️ Leitura: ${item.tempo_leitura} min</span>
                </div>
            </div>
        </article>
    `;
}

// --- Compartilhar Matéria ---
async function shareArticle(titulo, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: titulo,
                text: `${titulo} - Jornal Bem Baiano IF Baiano`,
                url: url
            });
        } catch (err) {
            console.log('Share cancelado:', err);
        }
    } else {
        navigator.clipboard.writeText(url);
        alert('Link da matéria copiado para a sua área de transferência!');
    }
}

// --- Renderização do Grid ---
function renderGrid(dataset) {
    const grid = document.getElementById('news-grid');
    const pagination = document.getElementById('pagination-controls');
    if (!grid || !pagination) return;

    grid.innerHTML = '';
    pagination.innerHTML = '';
    
    if (dataset.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><p style="font-size: 1.2rem; font-weight: bold; color: var(--color-text-muted);">Nenhuma matéria encontrada com os filtros selecionados.</p></div>';
        return;
    }

    const savedLinks = getSavedLinks();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = dataset.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    paginatedItems.forEach(item => {
        let imageHTML = '';
        if (item.imagem) {
            imageHTML = `<img src="${item.imagem}" alt="${item.titulo}" class="news-card-img" loading="lazy">`;
        } else {
            imageHTML = `<div class="img-wrapper-fallback"><img src="./marca-if-baiano-vertical.png" alt="IF Baiano Logo" class="fallback-img" loading="lazy"></div>`;
        }
        
        const isSaved = savedLinks.includes(item.link);
        const savedIcon = isSaved ? '🔖 Salvo' : '🔖 Salvar';

        const card = document.createElement('article');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-card-img-container">
                ${imageHTML}
            </div>
            <div class="news-card-body">
                <div class="badges">
                    <span class="tag-campus">${item.campus}</span>
                    <span class="tag-cat ${item.tag.cssClass}">${item.tag.name}</span>
                </div>
                <h3><a href="${item.link}" target="_blank" rel="noopener">${item.titulo}</a></h3>
                <p>${item.resumo ? item.resumo.substring(0, 110) + '...' : ''}</p>
                
                <div class="card-actions">
                    <div class="meta-info" style="border-top:none; padding-top:0; margin-top:0;">
                        <span>📅 ${item.data}</span>
                        <span>⏱️ ${item.tempo_leitura} min</span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn-icon btn-share-action" title="Compartilhar matéria">📤</button>
                        <button class="btn-icon btn-save-action" title="Salvar matéria">${savedIcon}</button>
                    </div>
                </div>
            </div>
        `;

        // Action Events
        const btnShare = card.querySelector('.btn-share-action');
        if (btnShare) {
            btnShare.addEventListener('click', (e) => {
                e.preventDefault();
                shareArticle(item.titulo, item.link);
            });
        }

        const btnSave = card.querySelector('.btn-save-action');
        if (btnSave) {
            btnSave.addEventListener('click', (e) => {
                e.preventDefault();
                def_toggle_save(item.link);
            });
        }

        grid.appendChild(card);
    });

    // Controles de Paginação
    const totalPages = Math.ceil(dataset.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (currentPage > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.textContent = '« Edição Anterior';
            btnPrev.className = 'btn-page';
            btnPrev.onclick = () => { 
                currentPage--; 
                renderGrid(dataset); 
                window.scrollTo({ top: document.getElementById('ultimas').offsetTop - 60, behavior: 'smooth' }); 
            };
            pagination.appendChild(btnPrev);
        }
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        pageInfo.className = 'page-info';
        pagination.appendChild(pageInfo);

        if (currentPage < totalPages) {
            const btnNext = document.createElement('button');
            btnNext.textContent = 'Próxima Edição »';
            btnNext.className = 'btn-page';
            btnNext.onclick = () => { 
                currentPage++; 
                renderGrid(dataset); 
                window.scrollTo({ top: document.getElementById('ultimas').offsetTop - 60, behavior: 'smooth' }); 
            };
            pagination.appendChild(btnNext);
        }
    }
}
