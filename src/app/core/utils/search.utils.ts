/**
 * Utilitários de pesquisa seguros e eficientes
 * Implementa busca flexível que encontra correspondências parciais e por sílabas
 */

/**
 * Normaliza uma string para busca: remove acentos, converte para minúsculas e remove espaços extras
 * @param text - Texto a normalizar
 * @returns Texto normalizado
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove marcas diacríticas
    .trim()
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Sanitiza input do usuário para prevenir problemas de segurança
 * @param input - Input do usuário
 * @returns Input sanitizado
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove caracteres potencialmente perigosos mas mantém letras, números, espaços e pontuação básica
  return input
    .replace(/[<>'"]/g, '') // Remove HTML tags e aspas problemáticas
    .trim()
    .slice(0, 200); // Limita o tamanho para prevenir ataques de DoS
}

/**
 * Busca flexível que encontra correspondências parciais
 * Funciona por sílabas e partes da palavra, não apenas correspondência exata
 * 
 * @param text - Texto onde procurar
 * @param query - Termo de busca
 * @returns true se houver correspondência
 */
export function flexibleSearch(text: string, query: string): boolean {
  if (!query || !text) return true; // Se não há query, retorna tudo
  
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(sanitizeInput(query));
  
  if (normalizedQuery.length === 0) return true;
  
  // Busca simples se query for muito curta
  if (normalizedQuery.length <= 2) {
    return normalizedText.includes(normalizedQuery);
  }
  
  // Divide a query em palavras
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
  
  // Todas as palavras da query devem estar presentes no texto (em qualquer ordem)
  return queryWords.every(word => {
    // Verifica se a palavra está presente
    if (normalizedText.includes(word)) return true;
    
    // Busca por partes da palavra (mínimo 3 caracteres)
    if (word.length >= 3) {
      // Divide a palavra em segmentos de 3+ caracteres e verifica se algum está presente
      for (let i = 0; i <= word.length - 3; i++) {
        const segment = word.slice(i, i + 3);
        if (normalizedText.includes(segment)) return true;
      }
    }
    
    return false;
  });
}

/**
 * Busca flexível em múltiplos campos
 * @param item - Objeto com campos para pesquisar
 * @param query - Termo de busca
 * @param fields - Array de campos (strings ou funções que retornam string)
 * @returns true se houver correspondência em algum campo
 */
export function flexibleSearchMultiField<T>(
  item: T,
  query: string,
  fields: Array<keyof T | ((item: T) => string | null | undefined)>
): boolean {
  if (!query) return true;
  
  const sanitizedQuery = sanitizeInput(query);
  if (!sanitizedQuery) return true;
  
  return fields.some(field => {
    let value: string | null | undefined;
    
    if (typeof field === 'function') {
      value = field(item);
    } else {
      const fieldValue = item[field];
      value = typeof fieldValue === 'string' ? fieldValue : null;
    }
    
    if (!value) return false;
    return flexibleSearch(value, sanitizedQuery);
  });
}

/**
 * Função de autocomplete segura para filtrar listas
 * @param items - Array de strings para filtrar
 * @param query - Termo de busca
 * @param maxResults - Número máximo de resultados (padrão: 50)
 * @returns Array filtrado e limitado
 */
export function safeAutocomplete(
  items: string[],
  query: string,
  maxResults: number = 50
): string[] {
  if (!query || query.trim().length === 0) {
    return items.slice(0, maxResults);
  }
  
  const sanitizedQuery = sanitizeInput(query);
  if (!sanitizedQuery) return items.slice(0, maxResults);
  
  const filtered = items.filter(item => flexibleSearch(item, sanitizedQuery));
  return filtered.slice(0, maxResults);
}

/**
 * Autocomplete com ranking por similaridade para resultados mais relevantes.
 * Prioriza: correspondência exata > prefixo > palavras do texto > substring.
 */
export function rankedAutocomplete(
  items: string[],
  query: string,
  maxResults: number = 50
): string[] {
  if (!query || query.trim().length === 0) {
    return items.slice(0, maxResults);
  }

  const sanitizedQuery = sanitizeInput(query);
  if (!sanitizedQuery) return items.slice(0, maxResults);

  const normalizedQuery = normalizeText(sanitizedQuery);
  const queryWords = normalizedQuery.split(' ').filter(Boolean);

  const ranked = items
    .map(item => {
      const normalizedItem = normalizeText(item);
      const itemWords = normalizedItem.split(' ').filter(Boolean);
      let score = 0;

      if (normalizedItem === normalizedQuery) score += 1000;
      if (normalizedItem.startsWith(normalizedQuery)) score += 700;
      if (normalizedItem.includes(normalizedQuery)) score += 300;

      for (const queryWord of queryWords) {
        if (queryWord.length < 2) continue;

        if (itemWords.some(word => word.startsWith(queryWord))) {
          score += 200;
        } else if (itemWords.some(word => word.includes(queryWord))) {
          score += 120;
        } else if (flexibleSearch(normalizedItem, queryWord)) {
          score += 60;
        }
      }

      if (score === 0 && !flexibleSearch(item, normalizedQuery)) {
        return { item, score: -1 };
      }

      return { item, score };
    })
    .filter(entry => entry.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.localeCompare(b.item, 'pt', { sensitivity: 'base' });
    })
    .slice(0, maxResults)
    .map(entry => entry.item);

  return ranked;
}

/**
 * Debounce para otimizar buscas em tempo real
 * @param func - Função a executar
 * @param wait - Tempo de espera em ms (padrão: 300ms)
 * @returns Função com debounce
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}
