import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { t } from "../theme";

const CATEGORIES = ["Tümü", "Favorilerim", "müze", "park", "restoran", "tarihi", "alışveriş", "eğlence", "doğa"];

const SAMPLE_PLACES = [
  { id: 1, name: "Topkapı Sarayı", city: "İstanbul", category: "tarihi", description: "Osmanlı İmparatorluğu'nun görkemli sarayı.", latitude: 41.0115, longitude: 28.9833, rating: 4.8, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Topkapi_palace_harem_pool.jpg/640px-Topkapi_palace_harem_pool.jpg" },
  { id: 2, name: "Ayasofya", city: "İstanbul", category: "tarihi", description: "Bizans ve Osmanlı mimarisinin şaheseri.", latitude: 41.0086, longitude: 28.9802, rating: 4.9, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/640px-Hagia_Sophia_Mars_2013.jpg" },
  { id: 3, name: "Galata Kulesi", city: "İstanbul", category: "tarihi", description: "İstanbul'un simgelerinden ortaçağ kulesi.", latitude: 41.0256, longitude: 28.9742, rating: 4.6, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Galata_tower.jpg/640px-Galata_tower.jpg" },
  { id: 4, name: "Kapalıçarşı", city: "İstanbul", category: "alışveriş", description: "Dünyanın en büyük ve en eski kapalı çarşılarından.", latitude: 41.0108, longitude: 28.9681, rating: 4.5, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Grand_Bazaar%2C_Istanbul%2C_2013.jpg/640px-Grand_Bazaar%2C_Istanbul%2C_2013.jpg" },
  { id: 5, name: "Anıtkabir", city: "Ankara", category: "tarihi", description: "Atatürk'ün anıt mezarı ve müzesi.", latitude: 39.9257, longitude: 32.8375, rating: 4.9, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/An%C4%B1tkabir_aerial.jpg/640px-An%C4%B1tkabir_aerial.jpg" },
  { id: 6, name: "Ephesus", city: "İzmir", category: "tarihi", description: "Antik dünyanın en önemli Yunan şehirlerinden biri.", latitude: 37.9395, longitude: 27.3417, rating: 4.9, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/640px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg" },
  { id: 7, name: "Pamukkale", city: "Denizli", category: "doğa", description: "Beyaz kireçtaşı terasları ve termal havuzları.", latitude: 37.9137, longitude: 29.1187, rating: 4.8, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Pamukkale_2.jpg/640px-Pamukkale_2.jpg" },
  { id: 8, name: "Kapadokya", city: "Nevşehir", category: "doğa", description: "Peri bacaları ve balonlu turizmiyle ünlü.", latitude: 38.6431, longitude: 34.8289, rating: 4.9, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Goreme_Cappadocia.jpg/640px-Goreme_Cappadocia.jpg" },
  { id: 9, name: "Safranbolu", city: "Karabük", category: "tarihi", description: "UNESCO Dünya Mirası Osmanlı evleri.", latitude: 41.2532, longitude: 32.6817, rating: 4.7, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Safranbolu_0292.jpg/640px-Safranbolu_0292.jpg" },
  { id: 10, name: "Alaçatı", city: "İzmir", category: "eğlence", description: "Taş evleri ve rüzgar sörfüyle ünlü tatil beldesi.", latitude: 38.2800, longitude: 26.3760, rating: 4.7, image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Alacati_018.jpg/640px-Alacati_018.jpg" },
];

const EMPTY_FORM = { name: "", city: "", category: "tarihi", description: "", latitude: "", longitude: "", rating: "", image_url: "" };

// Nominatim'den yer ara
async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&namedetails=1&accept-language=tr`;
  const res = await fetch(url, { headers: { "Accept-Language": "tr" } });
  return res.json();
}

// Wikipedia title bul — Türkçe veya İngilizce Wikipedia'da ara
async function findWikipediaTitle(placeName, englishName) {
  const queries = [placeName, englishName].filter(Boolean);
  for (const q of queries) {
    for (const lang of ["en", "tr"]) {
      try {
        const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=1`);
        const data = await res.json();
        const title = data?.query?.search?.[0]?.title;
        if (title) return { title, lang };
      } catch { /* devam et */ }
    }
  }
  return null;
}

// Wikipedia'dan fotoğraf + sayfa görüntülemesiyle puan çek
async function fetchWikipediaData(placeName, englishName) {
  try {
    const found = await findWikipediaTitle(placeName, englishName);
    if (!found) return { image_url: null, rating: null };
    const { title, lang } = found;

    // İngilizce title için pageviews çek (daha güvenilir)
    let enTitle = title;
    if (lang === "tr") {
      try {
        const langRes = await fetch(`https://tr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=langlinks&lllang=en&format=json&origin=*`);
        const langData = await langRes.json();
        const p = Object.values(langData?.query?.pages || {})[0];
        enTitle = p?.langlinks?.[0]?.["*"] || title;
      } catch { /* tr → en çevirilemedi */ }
    }

    const encodedTitle = encodeURIComponent(enTitle.replace(/ /g, "_"));
    const now = new Date();
    const m1 = now.getMonth(); // 0-indexed
    const y = now.getFullYear();
    const end = `${y}${String(m1 + 1).padStart(2,"0")}01`;
    const prevM = m1 === 0 ? 12 : m1;
    const prevY = m1 === 0 ? y - 1 : y;
    const start = `${prevY}${String(prevM).padStart(2,"0")}01`;

    const [imgRes, viewsRes] = await Promise.all([
      fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*&pithumbsize=640`),
      fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodedTitle}/monthly/${start}/${end}`)
    ]);

    const imgData = await imgRes.json();
    const page = Object.values(imgData?.query?.pages || {})[0];
    const image_url = page?.thumbnail?.source || null;

    let rating = null;
    try {
      const viewsData = await viewsRes.json();
      const items = viewsData?.items || [];
      if (items.length > 0) {
        const avgViews = items.reduce((s, i) => s + i.views, 0) / items.length;
        // log10 ölçeği: 10k→3.5, 100k→4.1, 1M→4.7, 10M→5.0
        const raw = Math.log10(Math.max(avgViews, 1)) / Math.log10(10_000_000) * 2 + 3;
        rating = Math.min(5.0, Math.max(3.0, parseFloat(raw.toFixed(1))));
      }
    } catch { /* puan bırak */ }

    return { image_url, rating };
  } catch { return { image_url: null, rating: null }; }
}

export default function Places() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(new Set());
  const [sortBy, setSortBy] = useState("default");
  const [cityFilter, setCityFilter] = useState("Tüm Şehirler");
  const [reviewStats, setReviewStats] = useState({}); // { placeId: { avg, count } }
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("search"); // "search" | "manual"
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Arama state
  const [placeQuery, setPlaceQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const debounceRef = useRef(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    // DB mekanlarını çek (review_avg dahil)
    axios.get("http://localhost:5001/api/places/", authHeader)
      .then(r => {
        const allPlaces = r.data.places || [];
        setPlaces(allPlaces);
        const stats = {};
        allPlaces.forEach(p => {
          if (p.review_avg !== null && p.review_avg !== undefined) {
            stats[p.id] = { avg: p.review_avg, count: p.review_count || 0 };
          }
        });
        setReviewStats(stats);
      }).catch(() => {});
    axios.get("http://localhost:5001/api/favorites/", authHeader)
      .then(r => setFavorites(new Set(r.data.favorites.map(f => f.place_id))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cities = ["Tüm Şehirler", ...Array.from(new Set(places.map(p => p.city))).sort((a, b) => a.localeCompare(b, "tr"))];

  useEffect(() => {
    let res = places;
    if (category === "Favorilerim") {
      res = res.filter(p => favorites.has(p.id));
    } else if (category !== "Tümü") {
      res = res.filter(p => p.category === category);
    }
    if (cityFilter !== "Tüm Şehirler") {
      res = res.filter(p => p.city === cityFilter);
    }
    if (search) res = res.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === "rating_desc") res = [...res].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === "rating_asc") res = [...res].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else if (sortBy === "city_asc") res = [...res].sort((a, b) => a.city.localeCompare(b.city, "tr"));
    else if (sortBy === "name_asc") res = [...res].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    setFiltered(res);
  }, [category, search, places, favorites, sortBy, cityFilter]);

  // Nominatim debounce
  const handlePlaceQueryChange = useCallback((val) => {
    setPlaceQuery(val);
    setSelectedPlace(null);
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchNominatim(val);
        setSuggestions(results);
      } catch { setSuggestions([]); }
      setSearchLoading(false);
    }, 500);
  }, []);

  const handleSelectSuggestion = async (item) => {
    // Türkçe ve İngilizce isim — Nominatim her ikisini de döndürebilir
    const name = item.namedetails?.name || item.display_name.split(",")[0];
    const englishName = item.namedetails?.["name:en"] || item.display_name.split(",")[0];
    const city = item.address?.city || item.address?.town || item.address?.village || item.address?.county || item.address?.state || "";
    const lat = parseFloat(item.lat).toFixed(6);
    const lng = parseFloat(item.lon).toFixed(6);
    setPlaceQuery(name);
    setSuggestions([]);
    setSelectedPlace({ name, city, lat, lng, displayName: item.display_name });
    setForm(f => ({ ...f, name, city, latitude: lat, longitude: lng, image_url: "", rating: "" }));

    // Wikipedia'dan fotoğraf + puan (Türkçe + İngilizce isimle dene)
    setImageLoading(true);
    const { image_url, rating } = await fetchWikipediaData(name, englishName !== name ? englishName : null);
    setForm(f => ({
      ...f,
      image_url: image_url || "",
      rating: rating !== null ? String(rating) : f.rating,
    }));
    setImageLoading(false);
  };

  const toggleFavorite = async (place) => {
    const isFav = favorites.has(place.id);
    try {
      if (isFav) {
        await axios.delete(`http://localhost:5001/api/favorites/${place.id}`, authHeader);
        setFavorites(prev => { const s = new Set(prev); s.delete(place.id); return s; });
      } else {
        await axios.post(`http://localhost:5001/api/favorites/${place.id}`, {}, authHeader);
        setFavorites(prev => new Set([...prev, place.id]));
      }
    } catch (e) {
      if (e.response?.status === 400 && !isFav) setFavorites(prev => new Set([...prev, place.id]));
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM); setEditingId(null); setFormError("");
    setMode("search"); setPlaceQuery(""); setSuggestions([]); setSelectedPlace(null);
    setShowModal(true);
  };

  const openEdit = (place) => {
    setForm({ name: place.name, city: place.city, category: place.category, description: place.description || "", latitude: place.latitude || "", longitude: place.longitude || "", rating: place.rating || "", image_url: place.image_url || "" });
    setEditingId(place.id); setFormError(""); setMode("manual");
    setPlaceQuery(place.name); setSelectedPlace(null); setSuggestions([]);
    setShowModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.city.trim()) { setFormError("Mekan adı ve şehir zorunludur."); return; }
    if (form.rating && (isNaN(form.rating) || form.rating < 0 || form.rating > 5)) { setFormError("Puan 0-5 arasında olmalıdır."); return; }
    setFormLoading(true); setFormError("");
    const payload = {
      name: form.name.trim(), city: form.city.trim(), category: form.category,
      description: form.description.trim(),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      rating: form.rating ? parseFloat(form.rating) : 0,
      image_url: form.image_url || null,
    };
    try {
      if (editingId) {
        const res = await axios.put(`http://localhost:5001/api/places/${editingId}`, payload, authHeader);
        setPlaces(prev => prev.map(p => p.id === editingId ? res.data.place : p));
      } else {
        const res = await axios.post("http://localhost:5001/api/places/", payload, authHeader);
        setPlaces(prev => [...prev, res.data.place]);
      }
      setShowModal(false);
    } catch (e) {
      setFormError(e.response?.data?.error || "Bir hata oluştu.");
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (place) => {
    if (!window.confirm(`"${place.name}" silinsin mi?`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/places/${place.id}`, authHeader);
      setPlaces(prev => prev.filter(p => p.id !== place.id));
    } catch (e) { alert(e.response?.data?.error || "Silinemedi."); }
  };

  const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Mekanlar</h1>
          <p style={s.sub}>
            {category === "Favorilerim"
              ? `${filtered.length} favori mekan`
              : `${filtered.length} mekan listeleniyor`}
          </p>
        </div>
        <div style={s.headerRight}>
          <input style={s.searchInput} placeholder="Mekan veya şehir ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.filterSelect} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={s.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="default">Varsayılan</option>
            <option value="rating_desc">⭐ Puan: Yüksekten Düşüğe</option>
            <option value="rating_asc">⭐ Puan: Düşükten Yükseğe</option>
            <option value="name_asc">🔤 İsim A–Z</option>
            <option value="city_asc">📍 Şehir A–Z</option>
          </select>
          <button style={s.addBtn} onClick={openAdd}>+ Mekan Ekle</button>
        </div>
      </div>

      <div style={s.filters}>
        {CATEGORIES.map(c => (
          <button key={c} style={{...s.chip, ...(category === c ? s.chipActive : {})}} onClick={() => setCategory(c)}>
            {categoryEmoji(c)} {c}
          </button>
        ))}
      </div>

      <div style={s.grid}>
        {filtered.map(place => (
          <div key={place.id} style={s.card}>
            <div style={{...s.cardImg, cursor:"pointer"}} onClick={() => navigate(`/places/${place.id}`)}>
              {place.image_url
                ? <img src={place.image_url} alt={place.name} style={s.img} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                : null}
              <div style={{...s.imgFallback, display: place.image_url ? "none" : "flex"}}>
                <span style={{fontSize:"40px"}}>{categoryEmoji(place.category)}</span>
              </div>
              <button style={s.favBtn} onClick={e => { e.stopPropagation(); toggleFavorite(place); }}>
                {favorites.has(place.id) ? "❤️" : "🤍"}
              </button>
            </div>
            <div style={s.cardBody} onClick={() => navigate(`/places/${place.id}`)} >
              <div style={{...s.cardName, cursor:"pointer"}}>{place.name}</div>
              <div style={s.cardMeta}>
                <span style={s.cityTag}>📍 {place.city}</span>
                <span style={s.catTag}>{place.category}</span>
              </div>
              <div style={s.cardDesc}>{place.description || "—"}</div>
              <div style={s.cardFooter}>
                <div style={s.ratingBlock}>
                  {reviewStats[place.id] ? (
                    <div style={s.userRating}>
                      <span style={s.stars}>{stars(Math.round(reviewStats[place.id].avg))}</span>
                      <span style={s.ratingNum}>{Number(reviewStats[place.id].avg).toFixed(1)}</span>
                      <span style={s.ratingBadge}>👥 {reviewStats[place.id].count}</span>
                    </div>
                  ) : (
                    <div style={s.rating}>
                      <span style={s.stars}>{stars(Math.round(place.rating || 0))}</span>
                      <span style={s.ratingNum}>{Number(place.rating || 0).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div style={s.actions} onClick={e => e.stopPropagation()}>
                  <button style={s.editBtn} onClick={() => openEdit(place)}>Düzenle</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(place)}>Sil</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && places.length === 0 && (
          <div style={s.empty}>
            <span style={{fontSize:"48px"}}>🗺️</span>
            <div style={{fontWeight:600, fontSize:"15px"}}>Henüz mekan eklenmemiş</div>
            <div style={{fontSize:"13px"}}>İlk mekanını eklemek için "Mekan Ekle" butonuna tıkla.</div>
            <button style={s.addBtn} onClick={openAdd}>+ İlk Mekanı Ekle</button>
          </div>
        )}
        {filtered.length === 0 && places.length > 0 && (
          <div style={s.empty}><span style={{fontSize:"36px"}}>🔍</span> Arama kriterlerine uyan mekan bulunamadı.</div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>{editingId ? "Mekanı Düzenle" : "Mekan Ekle"}</div>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {!editingId && (
              <div style={s.modeTabs}>
                <button style={{...s.modeTab, ...(mode === "search" ? s.modeTabActive : {})}} onClick={() => setMode("search")}>🔍 Otomatik Ara</button>
                <button style={{...s.modeTab, ...(mode === "manual" ? s.modeTabActive : {})}} onClick={() => setMode("manual")}>✏️ Manuel Gir</button>
              </div>
            )}

            <div style={s.modalBody}>
              {mode === "search" && !editingId ? (
                <>
                  {/* ARAMA MODU */}
                  <div style={s.searchSection}>
                    <label style={s.fLabel}>Mekan Adıyla Ara</label>
                    <div style={s.searchWrap}>
                      <input
                        style={s.searchBig}
                        placeholder="ör. Topkapı Sarayı, Eiffel Kulesi, Colosseum..."
                        value={placeQuery}
                        onChange={e => handlePlaceQueryChange(e.target.value)}
                        autoFocus
                      />
                      {searchLoading && <div style={s.searchSpinner}>⏳</div>}
                    </div>
                    {suggestions.length > 0 && (
                      <div style={s.suggestionList}>
                        {suggestions.map((item, i) => (
                          <div key={i} style={s.suggestionItem} onClick={() => handleSelectSuggestion(item)}>
                            <div style={s.suggName}>{item.namedetails?.name || item.display_name.split(",")[0]}</div>
                            <div style={s.suggDetail}>{item.display_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedPlace && (
                    <div style={s.selectedCard}>
                      <div style={s.selectedInfo}>
                        <div style={s.selectedName}>{selectedPlace.name}</div>
                        <div style={s.selectedMeta}>📍 {selectedPlace.displayName}</div>
                        <div style={s.selectedCoords}>🌐 {selectedPlace.lat}, {selectedPlace.lng}</div>
                        {imageLoading && <div style={s.imgLoadingMsg}>⏳ Fotoğraf ve puan internetten çekiliyor...</div>}
                        {!imageLoading && form.image_url && (
                          <img src={form.image_url} alt="" style={s.previewImg} onError={e => e.target.style.display="none"} />
                        )}
                        {!imageLoading && form.rating && (
                          <div style={s.ratingBadgeLarge}>
                            ⭐ Puan: <strong>{form.rating}</strong> &nbsp;{"★".repeat(Math.round(form.rating))}{"☆".repeat(5 - Math.round(form.rating))}
                            <span style={s.ratingHint}> (Wikipedia popülerliğinden)</span>
                          </div>
                        )}
                        {!imageLoading && !form.image_url && (
                          <div style={s.noImgMsg}>Fotoğraf bulunamadı — manuel olarak URL ekleyebilirsin.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPlace && (
                    <div style={s.extraFields}>
                      <div style={s.formRow}>
                        <div style={s.formField}>
                          <label style={s.fLabel}>Kategori</label>
                          <select style={s.fInput} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                            {CATEGORIES.filter(c => c !== "Tümü").map(c => <option key={c} value={c}>{categoryEmoji(c)} {c}</option>)}
                          </select>
                        </div>
                        <div style={s.formField}>
                          <label style={s.fLabel}>Puan (0–5)</label>
                          <input style={s.fInput} type="number" min="0" max="5" step="0.1" placeholder="ör. 4.5" value={form.rating} onChange={e => setForm(f => ({...f, rating: e.target.value}))} />
                        </div>
                      </div>
                      <div style={s.formField}>
                        <label style={s.fLabel}>Açıklama</label>
                        <textarea style={{...s.fInput, ...s.fTextarea}} placeholder="Mekan hakkında kısa bilgi..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                      </div>
                      {!form.image_url && (
                        <div style={s.formField}>
                          <label style={s.fLabel}>Fotoğraf URL (isteğe bağlı)</label>
                          <input style={s.fInput} placeholder="https://..." value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* MANUEL MOD */}
                  <div style={s.formRow}>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Mekan Adı *</label>
                      <input style={s.fInput} placeholder="ör. Topkapı Sarayı" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                    </div>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Şehir *</label>
                      <input style={s.fInput} placeholder="ör. İstanbul" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
                    </div>
                  </div>
                  <div style={s.formRow}>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Kategori</label>
                      <select style={s.fInput} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                        {CATEGORIES.filter(c => c !== "Tümü").map(c => <option key={c} value={c}>{categoryEmoji(c)} {c}</option>)}
                      </select>
                    </div>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Puan (0–5)</label>
                      <input style={s.fInput} type="number" min="0" max="5" step="0.1" placeholder="ör. 4.5" value={form.rating} onChange={e => setForm(f => ({...f, rating: e.target.value}))} />
                    </div>
                  </div>
                  <div style={s.formField}>
                    <label style={s.fLabel}>Açıklama</label>
                    <textarea style={{...s.fInput, ...s.fTextarea}} placeholder="Mekan hakkında kısa bilgi..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                  </div>
                  <div style={s.formRow}>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Enlem (Latitude)</label>
                      <input style={s.fInput} placeholder="ör. 41.0115" type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({...f, latitude: e.target.value}))} />
                    </div>
                    <div style={s.formField}>
                      <label style={s.fLabel}>Boylam (Longitude)</label>
                      <input style={s.fInput} placeholder="ör. 28.9833" type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({...f, longitude: e.target.value}))} />
                    </div>
                  </div>
                  <div style={s.formField}>
                    <label style={s.fLabel}>Fotoğraf URL (isteğe bağlı)</label>
                    <input style={s.fInput} placeholder="https://..." value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} />
                    {form.image_url && <img src={form.image_url} alt="" style={s.previewImg} onError={e => e.target.style.display="none"} />}
                  </div>
                </>
              )}

              {formError && <div style={s.fError}>{formError}</div>}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>İptal</button>
              <button
                style={{...s.submitBtn, ...(formLoading || (mode === "search" && !selectedPlace && !editingId) ? {opacity:0.5} : {})}}
                onClick={handleFormSubmit}
                disabled={formLoading || (mode === "search" && !selectedPlace && !editingId)}
              >
                {formLoading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Mekan Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function categoryEmoji(cat) {
  const map = { Tümü:"🔍", Favorilerim:"❤️", müze:"🏛️", park:"🌳", restoran:"🍽️", tarihi:"🏰", alışveriş:"🛍️", eğlence:"🎡", doğa:"🏔️" };
  return map[cat] || "📍";
}

const s = {
  page: { minHeight:"calc(100vh - 58px)", background:t.bg, fontFamily:"system-ui,sans-serif", padding:"2rem 2.5rem" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.5rem", flexWrap:"wrap", gap:"1rem" },
  title: { fontSize:"24px", fontWeight:700, color:t.text, margin:0 },
  sub: { fontSize:"13px", color:t.textMuted, marginTop:"4px" },
  headerRight: { display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" },
  searchInput: { padding:"10px 14px", borderRadius:"10px", border:`1.5px solid ${t.border}`, background:"#fff", fontSize:"13px", outline:"none", width:"220px" },
  filterSelect: { padding:"10px 12px", borderRadius:"10px", border:`1.5px solid ${t.border}`, background:"#fff", fontSize:"13px", color:t.text, outline:"none", cursor:"pointer" },
  addBtn: { padding:"10px 20px", borderRadius:"10px", border:"none", background:t.gradient, color:"#fff", fontSize:"13px", fontWeight:600, cursor:"pointer" },
  filters: { display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"1.5rem" },
  chip: { padding:"7px 14px", borderRadius:"20px", border:`1.5px solid ${t.border}`, background:"#fff", fontSize:"12px", fontWeight:500, color:t.textMuted, cursor:"pointer" },
  chipActive: { background:t.primaryLight, color:t.primary, borderColor:t.primary },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1.25rem" },
  card: { background:"#fff", borderRadius:"16px", border:`1px solid ${t.border}`, overflow:"hidden", boxShadow:t.shadow },
  cardImg: { position:"relative", height:"160px", overflow:"hidden", background:"#F1F5F9" },
  img: { width:"100%", height:"100%", objectFit:"cover" },
  imgFallback: { width:"100%", height:"100%", alignItems:"center", justifyContent:"center", background:t.gradient },
  favBtn: { position:"absolute", top:"10px", right:"10px", background:"rgba(0,0,0,0.35)", border:"none", fontSize:"18px", cursor:"pointer", borderRadius:"50%", width:"34px", height:"34px", display:"flex", alignItems:"center", justifyContent:"center" },
  cardBody: { padding:"1rem 1.25rem 1.25rem" },
  cardName: { fontSize:"15px", fontWeight:700, color:t.text, marginBottom:"6px" },
  cardMeta: { display:"flex", gap:"6px", marginBottom:"8px", flexWrap:"wrap" },
  cityTag: { fontSize:"11px", padding:"3px 8px", borderRadius:"6px", background:t.primaryLight, color:t.primary, fontWeight:600 },
  catTag: { fontSize:"11px", padding:"3px 8px", borderRadius:"6px", background:"#F1F5F9", color:t.textMuted, fontWeight:500 },
  cardDesc: { fontSize:"12px", color:t.textMuted, lineHeight:1.5, marginBottom:"10px", minHeight:"32px" },
  cardFooter: { display:"flex", alignItems:"center", justifyContent:"space-between" },
  ratingBlock: { display:"flex", alignItems:"center" },
  rating: { display:"flex", alignItems:"center", gap:"5px" },
  userRating: { display:"flex", alignItems:"center", gap:"4px" },
  stars: { fontSize:"12px", color:"#F59E0B" },
  ratingNum: { fontSize:"12px", fontWeight:700, color:t.text },
  ratingBadge: { fontSize:"10px", padding:"2px 6px", borderRadius:"6px", background:t.primaryLight, color:t.primary, fontWeight:600 },
  actions: { display:"flex", gap:"6px" },
  editBtn: { padding:"4px 10px", borderRadius:"6px", border:`1px solid ${t.border}`, background:"transparent", fontSize:"11px", color:t.textMuted, cursor:"pointer" },
  deleteBtn: { padding:"4px 10px", borderRadius:"6px", border:"1px solid #FECACA", background:"transparent", fontSize:"11px", color:"#EF4444", cursor:"pointer" },
  empty: { gridColumn:"1/-1", textAlign:"center", padding:"4rem", color:t.textMuted, fontSize:"14px", display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" },
  modal: { background:"#fff", borderRadius:"20px", width:"100%", maxWidth:"560px", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column", maxHeight:"92vh" },
  modalHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1.5rem 1.75rem 1rem" },
  modalTitle: { fontSize:"18px", fontWeight:700, color:t.text },
  closeBtn: { background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:t.textMuted, lineHeight:1 },
  modeTabs: { display:"flex", gap:"6px", padding:"0 1.75rem 1rem", borderBottom:`1px solid ${t.border}` },
  modeTab: { flex:1, padding:"9px", borderRadius:"10px", border:`1.5px solid ${t.border}`, background:"transparent", fontSize:"13px", fontWeight:500, color:t.textMuted, cursor:"pointer" },
  modeTabActive: { background:t.primaryLight, color:t.primary, borderColor:t.primary },
  modalBody: { padding:"1.25rem 1.75rem", overflowY:"auto", flex:1 },
  searchSection: { marginBottom:"1rem" },
  searchWrap: { position:"relative" },
  searchBig: { width:"100%", padding:"12px 14px", borderRadius:"12px", border:`2px solid ${t.primary}`, fontSize:"14px", color:t.text, outline:"none", boxSizing:"border-box", background:"#F8FAFC" },
  searchSpinner: { position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"16px" },
  suggestionList: { border:`1px solid ${t.border}`, borderRadius:"12px", overflow:"hidden", marginTop:"6px", boxShadow:t.shadowMd },
  suggestionItem: { padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${t.borderLight}`, background:"#fff" },
  suggName: { fontSize:"13px", fontWeight:600, color:t.text },
  suggDetail: { fontSize:"11px", color:t.textMuted, marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  selectedCard: { background:t.primaryLight, borderRadius:"12px", padding:"1rem", marginBottom:"1rem", border:`1px solid ${t.primary}22` },
  selectedInfo: {},
  selectedName: { fontSize:"15px", fontWeight:700, color:t.primary, marginBottom:"4px" },
  selectedMeta: { fontSize:"11px", color:t.textMuted, marginBottom:"4px" },
  selectedCoords: { fontSize:"11px", color:t.textMuted, marginBottom:"10px" },
  imgLoadingMsg: { fontSize:"12px", color:t.textMuted, padding:"8px 0", fontStyle:"italic" },
  ratingBadgeLarge: { fontSize:"13px", color:t.primary, fontWeight:500, marginTop:"8px", padding:"6px 10px", background:"#fff", borderRadius:"8px", display:"inline-block" },
  ratingHint: { fontSize:"11px", color:t.textMuted, fontWeight:400 },
  previewImg: { width:"100%", height:"140px", objectFit:"cover", borderRadius:"8px", marginTop:"8px" },
  noImgMsg: { fontSize:"12px", color:t.textMuted, fontStyle:"italic" },
  extraFields: { marginTop:"4px" },
  modalFooter: { display:"flex", gap:"10px", padding:"1rem 1.75rem 1.5rem", borderTop:`1px solid ${t.border}` },
  formRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"1rem" },
  formField: { display:"flex", flexDirection:"column", gap:"5px", marginBottom:"1rem" },
  fLabel: { fontSize:"12px", fontWeight:600, color:t.textMuted },
  fInput: { padding:"10px 12px", borderRadius:"9px", border:`1.5px solid ${t.border}`, fontSize:"13px", color:t.text, background:"#F8FAFC", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"system-ui" },
  fTextarea: { minHeight:"72px", resize:"vertical" },
  fError: { padding:"10px 14px", borderRadius:"9px", background:"#FEF2F2", border:"1px solid #FECACA", color:"#EF4444", fontSize:"13px", marginTop:"4px" },
  cancelBtn: { flex:1, padding:"11px", borderRadius:"10px", border:`1.5px solid ${t.border}`, background:"transparent", color:t.textMuted, fontSize:"14px", fontWeight:600, cursor:"pointer" },
  submitBtn: { flex:2, padding:"11px", borderRadius:"10px", border:"none", background:t.gradient, color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer" },
};
