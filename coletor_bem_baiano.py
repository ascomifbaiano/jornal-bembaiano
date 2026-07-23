import requests
import pandas as pd
import time
import os

# Lista de Campi e URLs base (WP REST API)
CAMPI = {
    "Reitoria": "https://ifbaiano.edu.br/portal",
    "Alagoinhas": "https://www.ifbaiano.edu.br/unidades/alagoinhas",
    "Bom Jesus da Lapa": "https://www.ifbaiano.edu.br/unidades/lapa",
    "Catu": "https://www.ifbaiano.edu.br/unidades/catu",
    "Governador Mangabeira": "https://www.ifbaiano.edu.br/unidades/gmb",
    "Guanambi": "https://www.ifbaiano.edu.br/unidades/guanambi",
    "Itaberaba": "https://www.ifbaiano.edu.br/unidades/itaberaba",
    "Itapetinga": "https://www.ifbaiano.edu.br/unidades/itapetinga",
    "Santa Inês": "https://www.ifbaiano.edu.br/unidades/santaines",
    "Senhor do Bonfim": "https://www.ifbaiano.edu.br/unidades/bonfim",
    "Serrinha": "https://www.ifbaiano.edu.br/unidades/serrinha",
    "Teixeira de Freitas": "https://www.ifbaiano.edu.br/unidades/teixeira",
    "Uruçuca": "https://www.ifbaiano.edu.br/unidades/urucuca",
    "Valença": "https://www.ifbaiano.edu.br/unidades/valenca",
    "Xique-Xique": "https://www.ifbaiano.edu.br/unidades/xiquexique"
}

def limpar_html(texto):
    if not isinstance(texto, str):
        return ""
    import re
    texto_limpo = re.sub('<[^<]+?>', '', texto)
    return texto_limpo.replace('\n', ' ').replace('\r', '').replace('&nbsp;', ' ').strip()

def coletar_noticias(campus, base_url, paginas=3):
    noticias = []
    endpoint = f"{base_url}/wp-json/wp/v2/posts?_embed&per_page=10"
    
    print(f"Coletando Rede Interna: {campus}...")
    
    for page in range(1, paginas + 1):
        url = f"{endpoint}&page={page}"
        try:
            response = requests.get(url, timeout=15)
            if response.status_code != 200:
                break
            
            dados = response.json()
            if not dados:
                break
                
            for item in dados:
                # Extração segura de dados
                titulo = item.get('title', {}).get('rendered', '')
                titulo = limpar_html(titulo)
                
                link = item.get('link', '')
                data_raw = item.get('date', '')
                
                data_formatada = ""
                hora_formatada = ""
                if data_raw:
                    try:
                        dt = pd.to_datetime(data_raw)
                        data_formatada = dt.strftime('%Y-%m-%d')
                        hora_formatada = dt.strftime('%H:%M')
                    except:
                        pass
                
                resumo_completo = item.get('excerpt', {}).get('rendered', '')
                resumo_limpo = limpar_html(resumo_completo)
                # Limita o resumo a 200 caracteres para o grid
                resumo = resumo_limpo[:200] + '...' if len(resumo_limpo) > 200 else resumo_limpo
                
                # Cálculo de tempo de leitura
                palavras = len(limpar_html(item.get('content', {}).get('rendered', '')).split())
                tempo_leitura = max(1, palavras // 200)
                
                # Imagem destacada (_embed)
                imagem = ""
                if '_embedded' in item and 'wp:featuredmedia' in item['_embedded']:
                    media = item['_embedded']['wp:featuredmedia']
                    if media and len(media) > 0 and 'source_url' in media[0]:
                        imagem = media[0]['source_url']
                
                noticias.append({
                    'campus': campus,
                    'titulo': titulo,
                    'link': link,
                    'data': data_formatada,
                    'hora': hora_formatada,
                    'tempo_leitura': tempo_leitura,
                    'resumo': resumo,
                    'imagem': imagem
                })
                
        except Exception as e:
            print(f"Erro no campus {campus}, página {page}: {e}")
            break
            
        time.sleep(1) # Respeito à API
        
    return noticias

def main():
    print("Iniciando Motor de Busca Editorial do Jornal Bem Baiano v2...")
    todas_noticias = []
    
    # Criar pastas se não existirem
    os.makedirs('data', exist_ok=True)
    os.makedirs('data/campi', exist_ok=True)
    
    for campus, url in CAMPI.items():
        # Coleta 5 páginas (50 notícias mais recentes de cada campus)
        noticias_campus = coletar_noticias(campus, url, paginas=5)
        
        if noticias_campus:
            df_campus = pd.DataFrame(noticias_campus)
            # Salvar micro-csv do campus
            nome_arquivo = campus.lower().replace(' ', '_').replace('-', '_')
            df_campus.to_csv(f'data/campi/{nome_arquivo}.csv', index=False, encoding='utf-8')
            
            todas_noticias.extend(noticias_campus)
            
    if todas_noticias:
        df_geral = pd.DataFrame(todas_noticias)
        # Ordena da mais recente para a mais antiga
        df_geral['data_hora'] = pd.to_datetime(df_geral['data'] + ' ' + df_geral['hora'])
        df_geral = df_geral.sort_values('data_hora', ascending=False)
        df_geral = df_geral.drop(columns=['data_hora'])
        
        # Salva o arquivo global
        df_geral.to_csv('data/historico_noticias.csv', index=False, encoding='utf-8')
        
        # Salva o arquivo apenas com as top 300 para carregamento rápido
        df_recentes = df_geral.head(300)
        df_recentes.to_csv('data/geral_recentes.csv', index=False, encoding='utf-8')
        
        print(f"Sucesso! Jornal atualizado com um total de {len(todas_noticias)} matérias.")
    
    print("Processo editorial finalizado.")

if __name__ == "__main__":
    main()
