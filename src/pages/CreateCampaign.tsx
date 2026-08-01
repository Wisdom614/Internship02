import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, ExternalLink, Check, Loader2, Globe, ShieldCheck } from 'lucide-react';

export default function CreateCampaign() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [clickLink, setClickLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  
  const [creating, setCreating] = useState(false);
  const [trackingScript, setTrackingScript] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Automatically fetch the real Campaign ID from the database on load
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    
    // Get the user's first active campaign
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching campaign:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setCampaignId(data.id);
      setShowForm(false);
    } else {
      setCampaignId(null);
      setShowForm(true);
    }
    setLoading(false);
  };

  const generateTrackingScript = (_campId: string, campName: string) => {
    return `
<!-- Findora Tracking Pixel for ${campName} -->
<script>
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const clickId = urlParams.get('click_id');
  
  if (!clickId) return;

  const startTime = Date.now();
  const FINDORA_API = 'https://kdncxluglavhsygdxmio.supabase.co/functions/v1';

  fetch(\`\${FINDORA_API}/track-pixel\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ click_id: clickId, url: window.location.href })
  });

  window.addEventListener('beforeunload', () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    navigator.sendBeacon(\`\${FINDORA_API}/track-exit\`, JSON.stringify({ click_id: clickId, duration_seconds: duration }));
  });
})();
</script>
<!-- End Findora Pixel -->
  `.trim();
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !siteUrl || !dailyBudget) return;

    setCreating(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to create a campaign.");
      setCreating(false);
      return;
    }

    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    // Generate a random 6-character uppercase verification token
    const verifyToken = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Insert Site (Default verified = false, stores the token)
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .insert({ 
        url: siteUrl, 
        verified: false,
        user_id: user.id,
        verification_token: verifyToken // <--- Stores the token for later verification
      })
      .select('id');

    if (siteError || !siteData || siteData.length === 0) {
      console.error("Site creation error:", siteError);
      alert("Failed to create site.");
      setCreating(false);
      return;
    }

    // 2. Insert Campaign
    const { data: campaignData, error: campError } = await supabase
      .from('campaigns')
      .insert({ 
        site_id: siteData[0].id,
        user_id: user.id,
        name: campaignName, 
        daily_budget: parseFloat(dailyBudget),
        keywords: keywordArray,
        target_audience: targetAudience || null,
        budget: 100.00, 
        status: 'pending' // Starts as pending until verified!
      })
      .select('id, name')
      .single();

    if (campError || !campaignData) {
      console.error("Campaign creation error:", campError);
      alert("Failed to create campaign.");
      setCreating(false);
      return;
    }

    // 3. Generate Tracking Script
    const script = generateTrackingScript(campaignData.id, campaignData.name);
    setTrackingScript(script);
    setVerificationToken(verifyToken); // Save token to show to user
    setCampaignId(campaignData.id);
    
    setCreating(false);
    setShowForm(false);
  };

  const handleGenerateLink = () => {
    if (!campaignId) return;
    const link = `https://kdncxluglavhsygdxmio.supabase.co/functions/v1/redirect-click?cid=${campaignId}`;
    setClickLink(link);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Failed to copy!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-findora-dark">Launch Campaign</h1>
          <p className="text-slate-500 text-sm mt-1">
            {showForm ? "Register your website and create your first campaign." : "Manage your active campaigns."}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col gap-6">
          
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="p-3 bg-findora-purple/10 rounded-lg text-findora-purple">
              {showForm ? <Globe size={24} /> : <ExternalLink size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {showForm ? "Create Your Campaign" : "Campaign Generator"}
              </h2>
              <p className="text-sm text-slate-500">
                {loading ? "Loading campaigns..." : (showForm ? "Enter your website details and target keywords." : "Generate a live tracking link for your active campaign.")}
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading...
            </div>
          )}

          {/* CREATE CAMPAIGN FORM */}
          {!loading && showForm && (
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                  <input 
                    type="text" required value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Summer Sale 2026"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Daily Budget ($)</label>
                  <input 
                    type="number" required value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination Website URL</label>
                <input 
                  type="url" required value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="e.g. https://www.myshop.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Keywords <span className="text-slate-400 font-normal">(comma separated)</span></label>
                  <input 
                    type="text" value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. sneakers, shoes, nike"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input 
                    type="text" value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Men aged 18-35"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-findora-purple/20 focus:border-findora-purple"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={creating}
                  className="w-full sm:w-auto bg-findora-green text-white px-6 py-2.5 rounded-lg hover:bg-findora-green/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin" size={18} /> : "Register & Create Campaign"}
                </button>
              </div>
            </form>
          )}

          {/* TRACKING SCRIPT + VERIFICATION SUCCESS */}
          {!loading && !showForm && trackingScript && (
            <div className="mt-4 space-y-4">
              
              {/* Verification Instructions */}
              {verificationToken && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="text-amber-600 mt-1" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-800 mb-1">Step 1: Verify Your Website</h3>
                      <p className="text-xs text-amber-700 mb-3">
                        To activate your campaign and start receiving traffic, you must prove you own this website. 
                        <br />Copy the meta tag below and paste it inside the <strong>&lt;head&gt;</strong> section of your website's homepage.
                      </p>
                      <div className="bg-white p-3 rounded border border-amber-200 overflow-x-auto text-xs font-mono text-slate-700 mb-3">
                        {`<meta name="findora-verify" content="${verificationToken}">`}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`<meta name="findora-verify" content="${verificationToken}">`)}
                        className="flex items-center gap-2 bg-amber-600 text-white px-3 py-1.5 rounded text-xs hover:bg-amber-700 transition-colors"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Meta Tag'}
                      </button>
                      <p className="text-xs text-amber-600 mt-3">
                        <strong>Next step:</strong> Once added, go to your Dashboard and click <strong>"Verify"</strong> on your campaign.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Script */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">
                  Step 2: Install Tracking Pixel
                </h3>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto">
                  {trackingScript}
                </div>
                <button 
                  onClick={() => copyToClipboard(trackingScript)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Copy Script to Clipboard
                </button>
                <p className="text-xs text-blue-600 mt-3">
                  Place this code inside the <strong>&lt;head&gt;</strong> tag of every page on your website.
                </p>
              </div>
            </div>
          )}

          {/* LINK GENERATOR (Only if already verified and active) */}
          {!loading && !showForm && campaignId && !trackingScript && (
            <div className="space-y-4">
              <button 
                onClick={handleGenerateLink}
                className="w-full sm:w-auto bg-findora-purple text-white px-8 py-3 rounded-lg hover:bg-findora-purple/90 transition-colors font-medium shadow-sm shadow-findora-purple/20 flex items-center justify-center gap-2"
              >
                Generate Tracking Link
              </button>

              {clickLink && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Campaign Tracking URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 truncate font-mono text-sm text-slate-700 p-2 bg-white rounded border border-slate-100 break-all">
                      {clickLink}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.open(clickLink, '_blank')}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-findora-purple hover:border-findora-purple/50 transition-colors"
                      >
                        <ExternalLink size={16} />
                        <span className="text-xs font-medium">Visit</span>
                      </button>
                      <button 
                        onClick={() => copyToClipboard(clickLink)}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-findora-purple bg-findora-purple/10 rounded-lg hover:bg-findora-purple/20 transition-colors"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span className="text-xs font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}