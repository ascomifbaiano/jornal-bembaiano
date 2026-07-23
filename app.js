document.addEventListener('DOMContentLoaded', () => {
    initA11y();
    initLGPD();
    loadNewsData();
});

// Acessibilidade (A11y)
function initA11y() {
    const btnContrast = document.getElementById('btn-contrast');
    const btnIncrease = document.getElementById('btn-font-increase');
    const btnDecrease = document.getElementById('btn-font-decrease');
    let currentFontSize = 16; // base 16px

    btnContrast.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
    });

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

// LGPD Banner
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

// Parser simples para CSV gerado pelo Pandas
function csvToJson(csvText) {
    const lines = csvText.trim().split('\n');
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
        // Regex para capturar campos mesmo com aspas
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
        obj[headers[colIndex]] = value.trim();
        result.push(obj);
    }
    return result;
}

// Carregar e renderizar Notícias
async function loadNewsData() {
    try {
        const response = await fetch('./data/historico_noticias.csv');
        if (!response.ok) throw new Error('Dados não encontrados');
        
        const csvText = await response.text();
        let newsData = csvToJson(csvText);
        
        // Remove linhas vazias e dados inválidos
        newsData = newsData.filter(item => item.titulo && item.titulo !== '');
        
        if (newsData.length === 0) {
            throw new Error('CSV Vazio');
        }

        renderHero(newsData[0]);
        renderGrid(newsData.slice(1));
        populateFilter(newsData);
        
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        document.getElementById('hero-section').innerHTML = '<p>Erro ao carregar o destaque.</p>';
        document.getElementById('news-grid').innerHTML = '<p>Não foi possível carregar as notícias. Tente novamente mais tarde.</p>';
    }
}

function renderHero(newsItem) {
    const heroSection = document.getElementById('hero-section');
    const imageSrc = newsItem.imagem ? newsItem.imagem : 'https://via.placeholder.com/800x400?text=Sem+Imagem';
    
    heroSection.innerHTML = `
        <article class="hero-card">
            <img src="${imageSrc}" alt="Imagem de Destaque" class="hero-image" loading="lazy">
            <div class="hero-content">
                <span class="tag-campus">${newsItem.campus}</span>
                <h2><a href="${newsItem.link}" target="_blank">${newsItem.titulo}</a></h2>
                <p class="hero-excerpt">${newsItem.resumo || ''}</p>
                <div class="meta-info">
                    <span>📅 ${newsItem.data}</span>
                    <span>⏱️ Leitura: ${newsItem.tempo_leitura} min</span>
                </div>
            </div>
        </article>
    `;
}

function renderGrid(newsList) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    newsList.forEach(newsItem => {
        const imageSrc = newsItem.imagem ? newsItem.imagem : 'https://via.placeholder.com/400x200?text=IF+Baiano';
        
        const card = document.createElement('article');
        card.className = 'news-card';
        card.innerHTML = `
            <img src="${imageSrc}" alt="Imagem da Notícia" class="news-card-img" loading="lazy">
            <div class="news-card-body">
                <span class="tag-campus">${newsItem.campus}</span>
                <h3><a href="${newsItem.link}" target="_blank">${newsItem.titulo}</a></h3>
                <p>${newsItem.resumo ? newsItem.resumo.substring(0, 100) + '...' : ''}</p>
                <div class="meta-info">
                    <span>📅 ${newsItem.data}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function populateFilter(newsData) {
    const select = document.getElementById('campus-select');
    const campi = [...new Set(newsData.map(item => item.campus))].filter(Boolean).sort();
    
    campi.forEach(campus => {
        const option = document.createElement('option');
        option.value = campus;
        option.textContent = campus;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        const selected = e.target.value;
        const filtered = selected === 'todos' 
            ? newsData.slice(1) 
            : newsData.filter((item, index) => index > 0 && item.campus === selected);
            
        renderGrid(filtered);
    });
}
