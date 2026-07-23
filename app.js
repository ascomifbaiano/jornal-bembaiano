document.addEventListener('DOMContentLoaded', () => {
    initA11y();
    initLGPD();
    setupFilters();
    loadNewsData('data/geral_recentes.csv', true);
});

let currentData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let currentCategory = 'todas'; // Estado da categoria

// --- Acessibilidade ---
function initA11y() {
    const btnContrast = document.getElementById('btn-contrast');
    const btnIncrease = document.getElementById('btn-font-increase');
    const btnDecrease = document.getElementById('btn-font-decrease');
    let currentFontSize = 16;

    btnContrast.addEventListener('click', () => document.body.classList.toggle('high-contrast'));
    btnIncrease.addEventListener('click', () => {
        if (currentFontSize < 24) {
            currentFontSize += 2;
            document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
        }
    });
    btnDecrease.addEventListener('click', () => {
        if (currentFontSize > 12) {
            currentFontSize -= 2;
            document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
        }
    });
}

// --- LGPD Banner ---
function initLGPD() {
    const banner = document.getElementById('cookie-banner');
    const btnAccept = document.getElementById('btn-accept-cookies');
    if (!localStorage.getItem('lgpd_consent')) {
        banner.hidden = false;
    }
    btnAccept.addEventListener('click', () => {
        localStorage.setItem('lgpd_consent', 'true');
        banner.hidden = true;
    });
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
            return item;
        });

        currentData = newsData;
        currentPage = 1;
        
        if (isHome && newsData.length > 0) {
            const reitoriaNews = newsData.find(n => n.campus === 'Reitoria');
            const destaque = reitoriaNews ? reitoriaNews : newsData[0];
            renderHero(destaque);
            currentData = currentData.filter(n => n !== destaque);
        } else {
            document.getElementById('hero-section').innerHTML = '';
        }
        
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Erro ao carregar:', error);
        document.getElementById('news-grid').innerHTML = '<p>Erro ao carregar notícias.</p>';
    } finally {
        showLoader(false);
    }
}

// --- Filtros e Busca ---
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const campusSelect = document.getElementById('campus-select');
    const catLinks = document.querySelectorAll('.cat-link');
    
    // Lista de campi fixa
    const campiList = ["Alagoinhas", "Bom Jesus da Lapa", "Catu", "Governador Mangabeira", "Guanambi", "Itaberaba", "Itapetinga", "Reitoria", "Santa Inês", "Senhor do Bonfim", "Serrinha", "Teixeira de Freitas", "Uruçuca", "Valença", "Xique-Xique"];
    campiList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        campusSelect.appendChild(opt);
    });

    const triggerFilter = () => {
        currentPage = 1;
        applyFiltersAndRender();
    };

    searchInput.addEventListener('input', triggerFilter);
    
    // Navegação em Texto (Categorias)
    catLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            catLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-cat');
            triggerFilter();
        });
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

function applyFiltersAndRender() {
    const term = document.getElementById('search-input').value.toLowerCase();
    
    let filtered = currentData;
    
    if (term) {
        filtered = filtered.filter(n => n.titulo.toLowerCase().includes(term) || (n.resumo && n.resumo.toLowerCase().includes(term)));
    }
    if (currentCategory !== 'todas') {
        filtered = filtered.filter(n => n.tag.name === currentCategory);
    }
    
    renderGrid(filtered);
}

// --- Renderização ---
function renderHero(item) {
    const heroSection = document.getElementById('hero-section');
    
    let imageHTML = '';
    if (item.imagem) {
        imageHTML = `<img src="${item.imagem}" alt="Imagem Destaque" class="hero-image" loading="lazy">`;
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
                <h2><a href="${item.link}" target="_blank">${item.titulo}</a></h2>
                <p class="hero-excerpt">${item.resumo || ''}</p>
                <div class="meta-info">
                    <span>📅 ${item.data}</span>
                    <span>⏱️ Leitura: ${item.tempo_leitura} min</span>
                </div>
            </div>
        </article>
    `;
}

function renderGrid(dataset) {
    const grid = document.getElementById('news-grid');
    const pagination = document.getElementById('pagination-controls');
    grid.innerHTML = '';
    pagination.innerHTML = '';
    
    if (dataset.length === 0) {
        grid.innerHTML = '<p>Nenhuma matéria encontrada com estes filtros.</p>';
        return;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = dataset.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    paginatedItems.forEach(item => {
        let imageHTML = '';
        if (item.imagem) {
            imageHTML = `<img src="${item.imagem}" alt="Capa" class="news-card-img" loading="lazy">`;
        } else {
            imageHTML = `<div class="img-wrapper-fallback"><img src="./marca-if-baiano-vertical.png" alt="IF Baiano Logo" class="fallback-img" loading="lazy"></div>`;
        }
        
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
                <h3><a href="${item.link}" target="_blank">${item.titulo}</a></h3>
                <p>${item.resumo ? item.resumo.substring(0, 90) + '...' : ''}</p>
                <div class="meta-info">
                    <span>📅 ${item.data}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Controles de paginação
    const totalPages = Math.ceil(dataset.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (currentPage > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.textContent = '« Anterior';
            btnPrev.className = 'btn-page';
            btnPrev.onclick = () => { currentPage--; renderGrid(dataset); window.scrollTo(0, document.getElementById('ultimas').offsetTop - 50); };
            pagination.appendChild(btnPrev);
        }
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        pageInfo.className = 'page-info';
        pagination.appendChild(pageInfo);

        if (currentPage < totalPages) {
            const btnNext = document.createElement('button');
            btnNext.textContent = 'Próxima »';
            btnNext.className = 'btn-page';
            btnNext.onclick = () => { currentPage++; renderGrid(dataset); window.scrollTo(0, document.getElementById('ultimas').offsetTop - 50); };
            pagination.appendChild(btnNext);
        }
    }
}
