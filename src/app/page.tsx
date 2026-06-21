"use client";
import { useState, useEffect } from "react";
import { CATEGORIES, ITEM_DB, ENCHANTMENTS } from "@/lib/items";

export default function SpawnerDashboard() {
  const [players, setPlayers] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState("@a");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  
  // Update item selection when category changes
  const availableItems = ITEM_DB.filter(i => i.cat === activeCategory);
  const [selectedItem, setSelectedItem] = useState(availableItems[0] || ITEM_DB[0]);
  
  const [amount, setAmount] = useState(1);
  
  const [customEnchants, setCustomEnchants] = useState<{id: string, lvl: number}[]>([]);
  const [newEnchantId, setNewEnchantId] = useState("minecraft:sharpness");
  const [newEnchantLvl, setNewEnchantLvl] = useState(5);
  const [xpType, setXpType] = useState("levels");
  
  const [tpType, setTpType] = useState("player");
  const [tpTargetPlayer, setTpTargetPlayer] = useState("");
  const [tpCoords, setTpCoords] = useState("0 100 0");

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{msg: string, isError: boolean} | null>(null);

  useEffect(() => {
    fetchPlayers();
    const int = setInterval(fetchPlayers, 15000);
    return () => clearInterval(int);
  }, []);

  // Update selected item when category changes
  useEffect(() => {
    const items = ITEM_DB.filter(i => i.cat === activeCategory);
    if (items.length > 0) {
      setSelectedItem(items[0]);
    }
    setCustomEnchants([]); // reset enchants on cat change
  }, [activeCategory]);

  const fetchPlayers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (data.success && data.players) setPlayers(data.players);
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const showNotif = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGive = async () => {
    if (!selectedPlayer) {
      showNotif("Pilih pemain terlebih dahulu!", true);
      return;
    }

    setLoading(true);

    let rawCommand = "";

    if (activeCategory === "Teleport") {
      if (tpType === "player") {
        if (!tpTargetPlayer) {
          showNotif("Pilih pemain tujuan terlebih dahulu!", true);
          setLoading(false);
          return;
        }
        rawCommand = `tp ${selectedPlayer} ${tpTargetPlayer}`;
      } else {
        rawCommand = `tp ${selectedPlayer} ${tpCoords}`;
      }
    } else if (activeCategory === "XP & Levels") {
      rawCommand = `xp add ${selectedPlayer} ${amount} ${xpType}`;
    } else if (activeCategory === "Enchanted Books") {
      if (customEnchants.length === 0) {
        showNotif("Buku sihir harus ada isinya! Tambahkan minimal 1 enchantment.", true);
        setLoading(false);
        return;
      }
      const enchTags = customEnchants.map(e => `"${e.id}":${e.lvl}`).join(",");
      rawCommand = `give ${selectedPlayer} minecraft:enchanted_book[stored_enchantments={${enchTags}}] ${amount}`;
    } else {
      let itemTag = selectedItem.id;
      if (customEnchants.length > 0) {
        const enchTags = customEnchants.map(e => `"${e.id}":${e.lvl}`).join(",");
        itemTag = `${itemTag}[enchantments={${enchTags}}]`;
      }
      rawCommand = `give ${selectedPlayer} ${itemTag} ${amount}`;
    }

    try {
      const res = await fetch("/api/rcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: rawCommand }),
      });
      const data = await res.json();
      
      const serverResponse = data.response?.toString() || "";
      const isMcError = serverResponse.toLowerCase().includes("unknown") || 
                        serverResponse.toLowerCase().includes("error") || 
                        serverResponse.toLowerCase().includes("no player") ||
                        serverResponse.toLowerCase().includes("syntax");

      if (data.success && !isMcError) {
        showNotif(`Sukses: ${serverResponse || 'Berhasil dieksekusi!'}`, false);
      } else {
        showNotif(`Gagal: ${serverResponse || data.message}`, true);
      }
    } catch (error) {
      showNotif("Koneksi gagal.", true);
    } finally {
      setLoading(false);
    }
  };

  const addEnchant = () => {
    if (customEnchants.find(e => e.id === newEnchantId)) return;
    setCustomEnchants([...customEnchants, { id: newEnchantId, lvl: newEnchantLvl }]);
  };

  const removeEnchant = (id: string) => {
    setCustomEnchants(customEnchants.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8 flex items-center justify-center selection:bg-indigo-500/30">
      
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-600/20 border-b border-indigo-500/20 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">RCON Spawner</h1>
          <p className="text-slate-400 text-sm mt-1">Kirim item instan ke server Anda.</p>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Target Player */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-bold text-slate-300">Target Player</label>
              <button onClick={fetchPlayers} className={`text-xs text-indigo-400 font-semibold hover:underline ${refreshing ? 'opacity-50' : ''}`}>
                {refreshing ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
            <select 
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
            >
              <option value="@a">Semua Pemain (@a)</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">Kategori</label>
            <select 
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Items / XP */}
          {activeCategory !== "Enchanted Books" && activeCategory !== "XP & Levels" && activeCategory !== "Teleport" && (
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Pilih Item</label>
              <select 
                value={selectedItem.id}
                onChange={(e) => {
                  const item = availableItems.find(i => i.id === e.target.value);
                  if (item) setSelectedItem(item);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
              >
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Amount & XP Type */}
          {activeCategory !== "Teleport" && (
            <div className="flex gap-4">
              <div className="flex-1">
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Jumlah {activeCategory === "XP & Levels" ? "XP" : "Item"}
              </label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1" max="6400"
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
              />
            </div>
            {activeCategory === "XP & Levels" && (
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-300 mb-1.5">Tipe XP</label>
                <select 
                  value={xpType}
                  onChange={(e) => setXpType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                >
                  <option value="levels">Levels (Tingkat)</option>
                  <option value="points">Points (Titik)</option>
                </select>
              </div>
            )}
          </div>
          )}

          {/* Teleport Options */}
          {activeCategory === "Teleport" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5">Tujuan Teleportasi</label>
                <select 
                  value={tpType}
                  onChange={(e) => setTpType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                >
                  <option value="player">Ke Pemain Lain</option>
                  <option value="coords">Ke Koordinat (X Y Z)</option>
                </select>
              </div>

              {tpType === "player" ? (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Pemain Tujuan</label>
                  <select 
                    value={tpTargetPlayer}
                    onChange={(e) => setTpTargetPlayer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                  >
                    <option value="">-- Pilih Pemain --</option>
                    {players.filter(p => p !== selectedPlayer).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Koordinat (X Y Z)</label>
                  <input 
                    type="text" 
                    value={tpCoords} 
                    onChange={(e) => setTpCoords(e.target.value)} 
                    placeholder="Contoh: 100 64 -200"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono" 
                  />
                </div>
              )}
            </div>
          )}

          {/* Enchantments */}
          {(activeCategory === "Weapons" || activeCategory === "Tools" || activeCategory === "Armor" || activeCategory === "Enchanted Books") && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mt-2">
              <label className="block text-sm font-bold text-slate-400 mb-2">Custom Enchantments</label>
              
              <div className="flex gap-2 mb-3">
                <select 
                  value={newEnchantId} 
                  onChange={(e) => setNewEnchantId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                >
                  {ENCHANTMENTS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input 
                  type="number" 
                  value={newEnchantLvl} 
                  onChange={(e) => setNewEnchantLvl(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 text-slate-300 text-xs text-center rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none font-mono"
                />
                <button onClick={addEnchant} className="px-3 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 rounded-md font-bold text-lg transition-colors border border-indigo-500/30">+</button>
              </div>

              {customEnchants.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {customEnchants.map(ench => {
                    const name = ENCHANTMENTS.find(e => e.id === ench.id)?.name || ench.id;
                    return (
                      <div key={ench.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md text-sm">
                        <span className="font-medium text-slate-400">{name} <span className="text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded text-xs ml-1 border border-indigo-800/50">Lvl {ench.lvl}</span></span>
                        <button onClick={() => removeEnchant(ench.id)} className="text-slate-500 hover:text-rose-400 font-bold text-lg leading-none transition-colors">&times;</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleGive}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {loading ? "Mengirim..." : "Kirim Command"}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-[slideUp_0.3s_ease-out] z-50 border ${
          notification.isError ? "bg-rose-950 text-rose-200 border-rose-800" : "bg-emerald-950 text-emerald-200 border-emerald-800"
        }`}>
          <div className="font-semibold text-sm pr-2">{notification.isError ? "❌" : "✅"} {notification.msg}</div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
