export const getStockPrice = async (symbol: string): Promise<number | null> => {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    const data = await response.json();
    return data.quoteResponse.result[0]?.regularMarketPrice || null;
  } catch {
    return null;
  }
};

export const getCryptoPrice = async (symbol: string): Promise<number | null> => {
  const id = symbol.toLowerCase();
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const data = await response.json();
    return data[id]?.usd || null;
  } catch {
    return null;
  }
};