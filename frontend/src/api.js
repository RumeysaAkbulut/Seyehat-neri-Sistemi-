// Merkezi API URL — production'da REACT_APP_API_URL env'den gelir, local'de localhost kullanılır
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export default API_URL;
