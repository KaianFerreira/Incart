export type Locale = "pt" | "en"

export type Translations = {
  // Onboarding
  onboarding: {
    title: string
    description: string
    howItWorksTitle: string
    step1: string
    step2: string
    step3: string
    apiKeyLabel: string
    apiKeyPlaceholder: string
    apiKeyHelper: string
    apiKeyGetLink: string
    apiKeySave: string
    apiKeyErrorEmpty: string
    apiKeyErrorFormat: string
  }
  // Main page
  page: {
    title: string
    description: string
    cartTitle: string
    footer: string
  }
  // Camera
  camera: {
    takePicture: string
    takeAnother: string
    analyzingLabel: string
    couldNotReadPrice: string
    insecureWarning: string
  }
  // Cart
  cart: {
    emptyTitle: string
    emptyDescription: string
    clearButton: string
    total: string
    scannedAt: string
    close: string
    // Budget
    budgetLabel: string
    budgetPlaceholder: string
    budgetSet: string
    budgetOver: string
    budgetEdit: string
    budgetRemove: string
    // Category breakdown
    byCategory: string
    categoryOther: string
  }
  // Categories
  categories: {
    LATICINIOS: string
    BEBIDAS: string
    HORTIFRUTI: string
    CARNES: string
    PADARIA: string
    HIGIENE: string
    LIMPEZA: string
    CONGELADOS: string
    MERCEARIA: string
    OUTROS: string
  }
  // Settings
  settings: {
    title: string
    currentKey: string
    replaceKeyLabel: string
    saveKey: string
    savedMessage: string
    removeKey: string
    getKey: string
    language: string
    keyErrorEmpty: string
    keyErrorFormat: string
  }
}

export const pt: Translations = {
  onboarding: {
    title: "Bem-vindo ao Incart",
    description:
      "Aponte a camera para a etiqueta de preco na prateleira. O app registra o preco para voce comparar antes de ir ao caixa.",
    howItWorksTitle: "Como funciona",
    step1: "Tire uma foto da etiqueta de preco na prateleira.",
    step2: "Dois agentes de IA extraem e verificam o preco da imagem.",
    step3: "O item e adicionado ao carrinho para comparacao.",
    apiKeyLabel: "Sua chave de API Anthropic",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyHelper:
      "Sua chave fica salva so no navegador e nunca e enviada aos nossos servidores.",
    apiKeyGetLink: "Obter uma chave",
    apiKeySave: "Salvar chave e comecar",
    apiKeyErrorEmpty: "Digite sua chave de API.",
    apiKeyErrorFormat:
      "A chave deve comecar com sk-ant-... Verifique em console.anthropic.com.",
  },
  page: {
    title: "Escanear e verificar precos",
    description:
      "Aponte a camera para a etiqueta da prateleira. Seu carrinho e montado abaixo para comparar antes do caixa.",
    cartTitle: "Carrinho",
    footer: "Incart - Verificacao de precos com IA",
  },
  camera: {
    takePicture: "Tirar foto",
    takeAnother: "Tirar outra foto",
    analyzingLabel: "Analisando etiqueta...",
    couldNotReadPrice: "Nao foi possivel ler o preco",
    insecureWarning:
      "Em alguns celulares, http:// pode bloquear a camera. Use https:// ou um tunel se nada acontecer ao tocar.",
  },
  cart: {
    emptyTitle: "Carrinho vazio",
    emptyDescription: "Os itens escaneados aparecerao aqui com o preco em Reais.",
    clearButton: "Limpar carrinho",
    total: "Total",
    scannedAt: "Escaneado em",
    close: "Fechar",
    budgetLabel: "Meta de gasto",
    budgetPlaceholder: "Ex: 150,00",
    budgetSet: "Definir meta",
    budgetOver: "acima da meta",
    budgetEdit: "Editar",
    budgetRemove: "Remover",
    byCategory: "Por categoria",
    categoryOther: "Outros",
  },
  categories: {
    LATICINIOS: "Laticinios",
    BEBIDAS: "Bebidas",
    HORTIFRUTI: "Hortifruti",
    CARNES: "Carnes",
    PADARIA: "Padaria",
    HIGIENE: "Higiene",
    LIMPEZA: "Limpeza",
    CONGELADOS: "Congelados",
    MERCEARIA: "Mercearia",
    OUTROS: "Outros",
  },
  settings: {
    title: "Configuracoes",
    currentKey: "Chave de API atual",
    replaceKeyLabel: "Substituir chave de API",
    saveKey: "Salvar nova chave",
    savedMessage: "Chave salva com sucesso.",
    removeKey: "Remover chave e voltar ao inicio",
    getKey: "Obter uma chave no Anthropic Console",
    language: "Idioma",
    keyErrorEmpty: "Digite uma chave.",
    keyErrorFormat:
      "A chave deve comecar com sk-ant-... Verifique em console.anthropic.com.",
  },
}

export const en: Translations = {
  onboarding: {
    title: "Welcome to Incart",
    description:
      "Point your camera at a shelf price tag. The app logs the price so you can compare before reaching the checkout.",
    howItWorksTitle: "How it works",
    step1: "Take a photo of the shelf price tag.",
    step2: "Two AI agents extract and verify the price from the image.",
    step3: "The item is added to your cart for comparison.",
    apiKeyLabel: "Your Anthropic API key",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyHelper:
      "Your key is stored only in your browser and never sent to our servers.",
    apiKeyGetLink: "Get a key",
    apiKeySave: "Save key & get started",
    apiKeyErrorEmpty: "Please enter your API key.",
    apiKeyErrorFormat:
      "Key should start with sk-ant-... Check console.anthropic.com.",
  },
  page: {
    title: "Scan & verify prices",
    description:
      "Point your camera at a shelf label or receipt. Your cart builds below so you can compare before checkout.",
    cartTitle: "Cart",
    footer: "Incart - AI-powered price verification",
  },
  camera: {
    takePicture: "Take picture",
    takeAnother: "Take another picture",
    analyzingLabel: "Analyzing label...",
    couldNotReadPrice: "Could not read price",
    insecureWarning:
      "On some phones, http:// may block the camera. Use https:// or a tunnel if nothing happens when you tap.",
  },
  cart: {
    emptyTitle: "Cart is empty",
    emptyDescription: "Scanned items will appear here with prices in Brazilian Real.",
    clearButton: "Clear cart",
    total: "Total",
    scannedAt: "Scanned at",
    close: "Close",
    budgetLabel: "Spending target",
    budgetPlaceholder: "e.g. 150.00",
    budgetSet: "Set target",
    budgetOver: "over budget",
    budgetEdit: "Edit",
    budgetRemove: "Remove",
    byCategory: "By category",
    categoryOther: "Other",
  },
  categories: {
    LATICINIOS: "Dairy",
    BEBIDAS: "Beverages",
    HORTIFRUTI: "Produce",
    CARNES: "Meat",
    PADARIA: "Bakery",
    HIGIENE: "Personal Care",
    LIMPEZA: "Cleaning",
    CONGELADOS: "Frozen",
    MERCEARIA: "Grocery",
    OUTROS: "Other",
  },
  settings: {
    title: "Settings",
    currentKey: "Current API key",
    replaceKeyLabel: "Replace API key",
    saveKey: "Save new key",
    savedMessage: "Key saved successfully.",
    removeKey: "Remove key & return to setup",
    getKey: "Get a key from Anthropic Console",
    language: "Language",
    keyErrorEmpty: "Please enter a key.",
    keyErrorFormat:
      "Key should start with sk-ant-... Check console.anthropic.com.",
  },
}

export const translations: Record<Locale, Translations> = { pt, en }
