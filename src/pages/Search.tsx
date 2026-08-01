import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, ExternalLink, Globe, AlertCircle, Info, PlusCircle } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setSearched(true);
    setResults([]);
    setError(null);

    // Split search query into individual keywords
    const searchTerms = trimmedQuery.toLowerCase().split(' ').filter(t => t.length > 1);

    try {
      // Fetch all active, verified campaigns
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          daily_budget,
          keywords,
          target_audience,
          sites ( url, verified )
        `)
        .eq('status', 'active')
        .not('daily_budget', 'is', null)
        .gt('daily_budget', 0)
        .eq('sites.verified', true); // <--- CRITICAL: ONLY show verified sites!

      if (fetchError) throw fetchError;

      // --- THE RANKING ALGORITHM STARTS HERE ---
      const rankedResults = data
        ?.map(campaign => {
          let relevanceScore = 0;
          const campaignKeywords = campaign.keywords || [];

          // 1. Calculate Relevance Match (Exact matches get higher points)
          searchTerms.forEach(term => {
            campaignKeywords.forEach((kw: string) => {
              const lowerKw = kw.toLowerCase();
              if (lowerKw === term) {
                relevanceScore += 10; // Exact match!
              } else if (lowerKw.includes(term)) {
                relevanceScore += 5; // Partial match
              }
            });
          });

          // 2. Calculate Budget Score (Higher budget = higher score, but dampened so it doesn't overpower relevance)
          const budgetScore = (campaign.daily_budget || 0) / 5;

          // 3. Total Rank Score
          const totalScore = relevanceScore + budgetScore;

          return {
            ...campaign,
            relevanceScore,
            budgetScore,
            totalScore
          };
        })
        .filter(campaign => campaign.totalScore > 0) // Only show campaigns that actually matched
        .sort((a, b) => b.totalScore - a.totalScore); // Sort by highest total score

      setResults(rankedResults || []);
    } catch (err: any) {
      console.error("Search error:", err);
      setError("Failed to fetch results. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVisitSite = (campaignId: string, siteUrl: string) => {
    if (!siteUrl) return alert("No destination URL set.");
    const clickUrl = `https://kdncxluglavhsygdxmio.supabase.co/functions/v1/redirect-click?cid=${campaignId}`;
    window.open(clickUrl, '_blank');
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    // Manually trigger a search after a small delay
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-findora-gray flex flex-col">
      
      {/* --- TOP CLEAN NAV BAR --- */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-findora-purple rounded-lg flex items-center justify-center text-white font-bold text-lg">F</div>
          <h1 className="text-xl font-bold text-findora-dark tracking-tight hidden sm:block">Findora</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowAbout(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-findora-purple transition-colors"
          >
            <Info size={16} />
            <span className="hidden sm:inline">About</span>
          </button>
          <a 
            href="/login"
            className="flex items-center gap-1.5 text-sm font-medium bg-findora-purple/10 text-findora-purple px-4 py-2 rounded-lg hover:bg-findora-purple/20 transition-colors"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">List Your Site</span>
            <span className="sm:hidden">Advertise</span>
          </a>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col items-center px-4 pt-12 pb-16 w-full max-w-4xl mx-auto">
        <div className="w-full space-y-8">
          
          {/* Hero Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-16 h-16 bg-findora-purple rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-lg shadow-findora-purple/20">
                F
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-findora-dark tracking-tight">Findora</h1>
            <p className="text-slate-500 text-lg max-w-md mx-auto">
              Discover the best websites. Search by keyword to find top-rated advertisers.
            </p>
          </div>

          {/* Main Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 pl-5 transition-all focus-within:ring-4 focus-within:ring-findora-purple/10 focus-within:border-findora-purple">
              <Search className="text-slate-400 flex-shrink-0" size={22} />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for websites... (e.g. 'shoes', 'sneakers')"
                className="flex-1 px-4 py-3 outline-none text-slate-700 bg-transparent placeholder:text-slate-400"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-findora-purple text-white px-6 py-3 rounded-xl font-medium hover:bg-findora-purple/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-findora-purple/20"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
              </button>
            </div>
          </form>

          {/* --- QUICK SEARCH CHIPS --- */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="text-xs text-slate-400 mr-1 self-center">Quick search:</span>
            {['sneakers', 'shoes', 'running', 'boots', 'sports'].map((term) => (
              <button
                key={term}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs transition-colors"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Results Area */}
          <div className="space-y-4 min-h-[200px] pt-4">
            
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mb-3" size={32} />
                <p>Searching for relevant websites...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
                <h3 className="text-lg font-medium text-red-700">Oops! Something went wrong</h3>
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {/* No Results State */}
            {!loading && !error && searched && results.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Globe className="mx-auto text-slate-300 mb-4" size={56} />
                <h3 className="text-xl font-medium text-slate-700">No advertisers found</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">
                  Try a different keyword. Advertisers must set matching keywords to appear in search results.
                </p>
              </div>
            )}

            {/* Results List */}
            {!loading && !error && results.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <p className="text-sm text-slate-500 font-medium">
                    Found <span className="text-findora-purple font-bold">{results.length}</span> relevant advertiser{results.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-400">Ranked by relevance + ad budget</p>
                </div>

                {results.map((campaign, index) => (
                  <div key={campaign.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                    
                    {/* Ad Rank Badge */}
                    <div className="absolute -top-2 -left-2 bg-findora-purple text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm opacity-70">
                      #{index + 1}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-findora-dark">{campaign.name}</h3>
                      
                      {/* Score Breakdown (Excellent for debugging and demos) */}
                      <div className="flex flex-wrap gap-4 mt-1 text-[10px] text-slate-400">
                        <span>Relevance: <span className="text-findora-purple font-bold">{campaign.relevanceScore}</span></span>
                        <span>Budget: <span className="text-findora-green font-bold">{campaign.budgetScore}</span></span>
                        <span>Total Rank: <span className="text-slate-800 font-bold">{campaign.totalScore}</span></span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaign.keywords?.slice(0, 5).map((kw: string, i: number) => (
                          <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                            {kw}
                          </span>
                        ))}
                        {campaign.keywords?.length > 5 && (
                          <span className="text-xs text-slate-400 px-2.5 py-1">
                            +{campaign.keywords.length - 5} more
                          </span>
                        )}
                      </div>

                      {campaign.target_audience && (
                        <p className="text-xs text-findora-purple font-medium mt-2 flex items-center gap-1">
                          <span className="text-slate-400">Target:</span> {campaign.target_audience}
                        </p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleVisitSite(campaign.id, campaign.sites?.url)}
                      className="flex items-center gap-2 bg-findora-green/10 text-findora-green px-5 py-2.5 rounded-lg font-medium hover:bg-findora-green/20 transition-colors whitespace-nowrap"
                    >
                      Visit Site
                      <ExternalLink size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- ABOUT MODAL --- */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-findora-purple rounded-lg flex items-center justify-center text-white font-bold text-lg">F</div>
              <h2 className="text-xl font-bold text-findora-dark">About Findora</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <strong className="text-slate-800">Findora</strong> is a semi-search engine that connects users with top-rated advertisers.
              </p>
              <p>
                <strong>For Advertisers:</strong> Register your site, set a daily budget, and choose keywords. We'll display your site to relevant searchers.
              </p>
              <p>
                <strong>For Searchers:</strong> Search for specific keywords (like "shoes" or "sports") and discover the best advertisers, sorted by their daily budget and relevance.
              </p>
              <div className="pt-2 border-t border-slate-100 mt-2">
                <a 
                  href="/login" 
                  className="inline-block w-full text-center bg-findora-purple text-white py-2 rounded-lg font-medium hover:bg-findora-purple/90 transition-colors"
                >
                  Start Advertising Today
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}