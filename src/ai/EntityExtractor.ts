import { ExtractedEntities } from './types';

export class EntityExtractor {
  public static validBrazilianStates = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]);

  public static cityStateLookup: Record<string, string> = {
    'são paulo': 'SP',
    'sao paulo': 'SP',
    'rio de janeiro': 'RJ',
    'campinas': 'SP',
    'belo horizonte': 'MG',
    'curitiba': 'PR',
    'porto alegre': 'RS',
    'salvador': 'BA',
    'fortaleza': 'CE',
    'brasília': 'DF',
    'brasilia': 'DF',
    'recife': 'PE',
    'goiânia': 'GO',
    'goiania': 'GO',
    'belém': 'PA',
    'belem': 'PA',
    'manaus': 'AM',
    'florianópolis': 'SC',
    'florianopolis': 'SC',
    'vitória': 'ES',
    'vitoria': 'ES',
    'santos': 'SP',
    'sorocaba': 'SP',
    'niterói': 'RJ',
    'niteroi': 'RJ',
    'ribeirão preto': 'SP',
    'ribeirao preto': 'SP',
    'são josé dos campos': 'SP',
    'sao jose dos campos': 'SP',
    'uberlândia': 'MG',
    'uberlandia': 'MG',
    'londrina': 'PR',
    'maringá': 'PR',
    'maringa': 'PR',
    'joinville': 'SC',
    'caxias do sul': 'RS',
    'são bernardo do campo': 'SP',
    'sao bernardo do campo': 'SP'
  };

  /**
   * Helper to check if a user input indicates skipping an optional field
   */
  public static isNegativeOrSkipResponse(input: string): boolean {
    if (!input) return true;
    const lower = input.trim().toLowerCase();

    const exactSkips = [
      'pular', 'não', 'nao', 'nenhum', 'nenhuma', 'sem', 'deixar em branco',
      'em branco', 'vazio', '-', 'passar', 'depois', 'proximo', 'próximo',
      'ninguém', 'ninguem', 'não informar', 'nao informar', 'prefiro não informar',
      'prefiro nao informar', 'sem informação', 'sem informacao', 'sem observação',
      'sem observacao', 'sem obs', 'descartar', 'ignorar'
    ];

    if (exactSkips.includes(lower)) return true;

    if (
      lower.startsWith('pular') ||
      lower.startsWith('não') ||
      lower.startsWith('nao') ||
      lower.startsWith('sem ') ||
      lower.startsWith('deixar') ||
      lower.startsWith('prefiro') ||
      lower.startsWith('ignorar') ||
      lower.startsWith('nenhum')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Phone validation & formatting
   */
  public static validateAndFormatPhone(raw: string): { isValid: boolean; formatted: string } {
    if (!raw) return { isValid: false, formatted: '' };
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      const ddd = digits.substring(0, 2);
      if (digits.length === 11) {
        const num1 = digits.substring(2, 7);
        const num2 = digits.substring(7);
        return { isValid: true, formatted: `(${ddd}) ${num1}-${num2}` };
      } else {
        const num1 = digits.substring(2, 6);
        const num2 = digits.substring(6);
        return { isValid: true, formatted: `(${ddd}) ${num1}-${num2}` };
      }
    }
    return { isValid: false, formatted: raw.trim() };
  }

  /**
   * Email validation
   */
  public static validateEmail(raw: string): boolean {
    if (!raw) return false;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(raw.trim());
  }

  /**
   * CPF validation & formatting
   */
  public static validateAndFormatCPF(raw: string): { isValid: boolean; formatted: string } {
    if (!raw) return { isValid: false, formatted: '' };
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) {
      // Basic check for repeated digits (e.g. 111.111.111-11)
      if (/^(\d)\1{10}$/.test(digits)) {
        return { isValid: false, formatted: raw.trim() };
      }
      const formatted = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
      return { isValid: true, formatted };
    }
    return { isValid: false, formatted: raw.trim() };
  }

  /**
   * Multi-stage pipeline extraction as requested:
   * 1. Extract Phone -> Remove phone
   * 2. Extract Email -> Remove email
   * 3. Extract CPF -> Remove CPF
   * 4. Extract City/State -> Remove location
   * 5. Extract Session Price -> Remove price
   * 6. Remove context & filler words
   * 7. Remaining text = Patient Name!
   */
  public static extractEntities(rawInput: string): ExtractedEntities {
    let workingText = rawInput || '';
    const result: ExtractedEntities = {
      confidence: {
        name: 0,
        phone: 0,
        email: 0,
        cpf: 0,
        location: 0,
        price: 0,
        overall: 0
      }
    };

    // ----------------------------------------------------
    // STEP 1: Extract Phone & Remove from working text
    // ----------------------------------------------------
    const phonePattern = /(?:\+?55\s*)?(?:\(?([1-9]{2})\)?\s*)?(?:9?\d{4})[\s\-]?(\d{4})/g;
    const phoneMatches = Array.from(workingText.matchAll(phonePattern));
    if (phoneMatches.length > 0) {
      const bestMatch = phoneMatches[0][0];
      const phoneRes = EntityExtractor.validateAndFormatPhone(bestMatch);
      if (phoneRes.isValid) {
        result.phone = phoneRes.formatted;
        result.confidence.phone = 1.0;
        // Remove matched phone from text
        workingText = workingText.replace(bestMatch, ' ');
      }
    }

    // ----------------------------------------------------
    // STEP 2: Extract Email & Remove from working text
    // ----------------------------------------------------
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
    const emailMatches = Array.from(workingText.matchAll(emailPattern));
    if (emailMatches.length > 0) {
      const bestEmail = emailMatches[0][0];
      if (EntityExtractor.validateEmail(bestEmail)) {
        result.email = bestEmail.toLowerCase();
        result.confidence.email = 1.0;
        workingText = workingText.replace(bestEmail, ' ');
      }
    }

    // ----------------------------------------------------
    // STEP 3: Extract CPF & Remove from working text
    // ----------------------------------------------------
    const cpfPattern = /\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}\b/g;
    const cpfMatches = Array.from(workingText.matchAll(cpfPattern));
    if (cpfMatches.length > 0) {
      const bestCpf = cpfMatches[0][0];
      const cpfRes = EntityExtractor.validateAndFormatCPF(bestCpf);
      if (cpfRes.isValid) {
        result.cpf = cpfRes.formatted;
        result.confidence.cpf = 1.0;
        workingText = workingText.replace(bestCpf, ' ');
      }
    }

    // ----------------------------------------------------
    // STEP 4: Extract City & State & Remove from working text
    // ----------------------------------------------------
    // 4a. City with explicit UF code e.g. "Campinas - SP", "Rio de Janeiro/RJ", "em Santos - SP"
    const cityUfPattern = /(?:,\s*de|,\s*em|mora em|reside em|cidade:?|morador(?:a)? de|\bde\b|\bem\b)?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,30})\s*[\-,\/]\s*([A-Za-z]{2})\b/gi;
    const cityUfMatch = cityUfPattern.exec(workingText);

    if (cityUfMatch) {
      const ufCandidate = cityUfMatch[2].toUpperCase();
      if (EntityExtractor.validBrazilianStates.has(ufCandidate)) {
        let cityRaw = cityUfMatch[1].trim();
        cityRaw = cityRaw.replace(/^(?:de|do|da|dos|das|em|cidade:?)\s+/i, '').trim();
        const stopwords = ['um', 'uma', 'paciente', 'mim', 'nome', 'telefone', 'email', 'sessao', 'sessão', 'valor', 'cpf', 'chamado', 'chamada', 'novo', 'nova'];
        if (cityRaw.length >= 2 && !stopwords.includes(cityRaw.toLowerCase())) {
          result.city = EntityExtractor.formatSmartCapitalization(cityRaw);
          result.state = ufCandidate;
          result.confidence.location = 1.0;
          workingText = workingText.replace(cityUfMatch[0], ' ');
        }
      }
    }

    // 4b. Explicit location phrase if not matched above
    if (!result.city) {
      const explicitLocPattern = /(?:mora em|reside em|morador(?:a)? de|cidade:?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,30})(?:\s*[\-,\/]\s*([A-Za-z]{2}))?/gi;
      const explicitMatch = explicitLocPattern.exec(workingText);
      if (explicitMatch) {
        let cityRaw = explicitMatch[1].trim();
        const ufCandidate = explicitMatch[2] ? explicitMatch[2].toUpperCase() : '';
        const stopwords = ['um', 'uma', 'paciente', 'mim', 'nome', 'telefone', 'email', 'sessao', 'sessão', 'valor', 'cpf', 'chamado', 'chamada', 'novo', 'nova'];
        if (cityRaw.length >= 2 && !stopwords.includes(cityRaw.toLowerCase())) {
          result.city = EntityExtractor.formatSmartCapitalization(cityRaw);
          result.state = ufCandidate && EntityExtractor.validBrazilianStates.has(ufCandidate) ? ufCandidate : EntityExtractor.cityStateLookup[result.city.toLowerCase()];
          result.confidence.location = 0.9;
          workingText = workingText.replace(explicitMatch[0], ' ');
        }
      }
    }

    // 4c. Lookup known cities in input
    if (!result.city) {
      const lowerText = workingText.toLowerCase();
      for (const [cityName, stateCode] of Object.entries(EntityExtractor.cityStateLookup)) {
        const cityRegex = new RegExp(`\\b${cityName.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        if (cityRegex.test(lowerText)) {
          result.city = EntityExtractor.formatSmartCapitalization(cityName);
          result.state = stateCode;
          result.confidence.location = 0.85;
          workingText = workingText.replace(cityRegex, ' ');
          break;
        }
      }
    }

    // ----------------------------------------------------
    // STEP 5: Extract Session Price & Remove from working text
    // ----------------------------------------------------
    const pricePattern = /(?:sessã|sessao|valor|preco|preço|r\$)\s*:?\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)|(\d+)\s*reais/gi;
    const priceMatch = pricePattern.exec(workingText);
    if (priceMatch) {
      const priceValStr = priceMatch[1] || priceMatch[2];
      if (priceValStr) {
        result.sessionPrice = parseFloat(priceValStr.replace(',', '.'));
        result.confidence.price = 1.0;
        workingText = workingText.replace(priceMatch[0], ' ');
      }
    }

    // ----------------------------------------------------
    // STEP 6: Remove Context & Command Words (Never part of name)
    // ----------------------------------------------------
    // Words to eliminate: cadastrar, paciente, pacientes, adicionar, adicione, incluir, inclua, criar, crie, novo, nova, para mim, para o, para a, chamado, chamada, de nome, com nome, com o nome, quero, gostaria, preciso, favor, por favor, olá, oi, bom dia, boa tarde, boa noite, etc.
    let cleanText = workingText;

    // Remove polite greetings
    cleanText = cleanText.replace(/^(?:por favor,?|clara,?|olá,?|oi,?|bom dia,?|boa tarde,?|boa noite,?)\s*/gi, ' ');
    // Remove intent prefixes
    cleanText = cleanText.replace(/\b(?:gostaria de|quero|preciso|pode|favor|me ajude a|ajude a)\b/gi, ' ');
    // Remove action verbs
    cleanText = cleanText.replace(/\b(?:cadastr(?:ar|e)?|adicionar|adicione|inclu(?:ir|a)|criar|crie|novo|nova)\b/gi, ' ');
    // Remove target recipient phrases
    cleanText = cleanText.replace(/\b(?:para mim|para o|para a)\b/gi, ' ');
    // Remove patient keywords
    cleanText = cleanText.replace(/\b(?:paciente|pacientes)\b/gi, ' ');
    // Remove naming clauses
    cleanText = cleanText.replace(/\b(?:chamad[oa]|de nome|com o nome|com nome|nome:?)\b/gi, ' ');
    // Remove standalone articles & prepositions at boundaries
    cleanText = cleanText.replace(/\b(?:um|uma|o|a|os|as|do|da|dos|das|em)\b/gi, ' ');
    // Remove residual location indicators
    cleanText = cleanText.replace(/\b(?:mora|reside|cidade|estado|morador|moradora)\b/gi, ' ');
    // Remove field labels
    cleanText = cleanText.replace(/\b(?:telefone|email|e-mail|cpf|sessao|sessão|valor|preco|preço|reais|obs|observacao|observações)\b/gi, ' ');

    // Strip leftover punctuation and clean extra whitespace
    cleanText = cleanText.replace(/^[.,:;!\?\-\s]+|[.,:;!\?\-\s]+$/g, '').replace(/\s+/g, ' ').trim();

    // ----------------------------------------------------
    // STEP 7: Remaining Text = Patient Name
    // ----------------------------------------------------
    if (cleanText && cleanText.length >= 2) {
      // Capitalize proper words (e.g., "joão pedro da silva" -> "João Pedro da Silva")
      const formattedName = cleanText
        .split(' ')
        .map((word, idx) => {
          const lower = word.toLowerCase();
          if (idx > 0 && ['de', 'da', 'do', 'dos', 'das', 'e'].includes(lower)) {
            return lower;
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');

      result.name = formattedName;
      result.rawTextRemaining = cleanText;

      // Calculate confidence score for Name:
      // High (1.0) if full name (>= 2 words) without numbers/symbols.
      // Moderate (0.65) if only 1 word (e.g., "João") -> will prompt for confirmation if needed!
      const words = formattedName.split(' ');
      if (words.length >= 2) {
        result.confidence.name = 0.95;
      } else {
        result.confidence.name = 0.65;
      }
    } else {
      result.confidence.name = 0;
    }

    // Calculate overall confidence metric
    const confValues = Object.values(result.confidence).filter(v => typeof v === 'number');
    result.confidence.overall = confValues.reduce((a, b) => a + b, 0) / (confValues.length || 1);

    return result;
  }

  /**
   * Smart capitalization for names and Brazilian cities.
   * Keeps prepositions (de, da, do, das, dos, e) in lowercase.
   */
  public static formatSmartCapitalization(text: string): string {
    if (!text) return '';
    const lowerPrepositions = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
    const words = text.trim().split(/\s+/);
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase();
      if (index === 0 || !lowerPrepositions.has(cleanWord)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return cleanWord;
    }).join(' ');
  }

  /**
   * Helper to parse emergency contact inputs into a clean structured object.
   * Handles inputs like:
   * - "12982314172 pai" -> { name: "Pai", phone: "(12) 98231-4172" }
   * - "Mãe 12987654321" -> { name: "Mãe", phone: "(12) 98765-4321" }
   * - "(12) 98231-4172" -> { name: "Não informado", phone: "(12) 98231-4172" }
   * - "Pai" -> { name: "Pai", phone: "Não informado" }
   */
  public static parseEmergencyContactDetails(input: string): { name: string; phone: string } {
    if (!input || this.isNegativeOrSkipResponse(input)) {
      return { name: 'Não informado', phone: 'Não informado' };
    }

    const trimmed = input.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (digitsOnly.length >= 8 && digitsOnly.length <= 11) {
      const phoneRes = this.validateAndFormatPhone(digitsOnly);
      const formattedPhone = phoneRes.isValid ? phoneRes.formatted : digitsOnly;

      let namePart = trimmed
        .replace(/\(?\d{2,5}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}/g, '')
        .replace(/\d+/g, '')
        .replace(/[\-:\/,\(\)]+/g, ' ')
        .trim();
      namePart = namePart.replace(/\s+/g, ' ');

      const formattedName = namePart ? this.formatSmartCapitalization(namePart) : 'Não informado';
      return { name: formattedName, phone: formattedPhone };
    }

    // If no phone digits present, check if input is a name
    const formattedName = this.formatSmartCapitalization(trimmed);
    return { name: formattedName || 'Não informado', phone: 'Não informado' };
  }

  /**
   * Legacy string helper maintained for backward compatibility
   */
  public static parseEmergencyContact(input: string): string {
    const details = this.parseEmergencyContactDetails(input);
    if (details.name !== 'Não informado' && details.phone !== 'Não informado') {
      return `${details.name} - ${details.phone}`;
    }
    if (details.phone !== 'Não informado') return details.phone;
    return details.name;
  }
}
