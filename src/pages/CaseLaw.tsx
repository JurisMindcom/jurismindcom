import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, Search, Gavel, Calendar, MapPin, 
  FileText, Bookmark, ExternalLink, Loader2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CaseLaw {
  id: string;
  case_title: string;
  case_title_bn: string | null;
  act_name: string;
  section_number: string | null;
  year: number | null;
  citation: string | null;
  verdict_summary: string | null;
  verdict_summary_bn: string | null;
  jurisdiction: string | null;
  keywords: string[] | null;
}

const sampleCases: CaseLaw[] = [
  {
    id: '1',
    case_title: 'Bangladesh vs. Sheikh Hasina',
    case_title_bn: 'বাংলাদেশ বনাম শেখ হাসিনা',
    act_name: 'Penal Code',
    section_number: '302',
    year: 2020,
    citation: 'BLD 2020 (HCD) 45',
    verdict_summary: 'Landmark case regarding criminal procedure and evidence requirements.',
    verdict_summary_bn: 'ফৌজদারি প্রক্রিয়া এবং প্রমাণের প্রয়োজনীয়তা সংক্রান্ত যুগান্তকারী মামলা।',
    jurisdiction: 'High Court Division',
    keywords: ['criminal', 'evidence', 'procedure'],
  },
  {
    id: '2',
    case_title: 'Rahman vs. Land Registration Authority',
    case_title_bn: 'রহমান বনাম ভূমি নিবন্ধন কর্তৃপক্ষ',
    act_name: 'Registration Act',
    section_number: '17',
    year: 2019,
    citation: 'DLR 2019 (AD) 112',
    verdict_summary: 'Important precedent for property registration disputes.',
    verdict_summary_bn: 'সম্পত্তি নিবন্ধন বিরোধের জন্য গুরুত্বপূর্ণ নজির।',
    jurisdiction: 'Appellate Division',
    keywords: ['property', 'registration', 'land'],
  },
  {
    id: '3',
    case_title: 'Begum vs. Begum (Family Division)',
    case_title_bn: 'বেগম বনাম বেগম (পারিবারিক বিভাগ)',
    act_name: 'Muslim Family Laws Ordinance',
    section_number: '7',
    year: 2021,
    citation: 'MLR 2021 (FC) 78',
    verdict_summary: 'Case establishing guidelines for maintenance and dower.',
    verdict_summary_bn: 'ভরণপোষণ এবং দেনমোহর সংক্রান্ত নির্দেশিকা প্রতিষ্ঠাকারী মামলা।',
    jurisdiction: 'Family Court',
    keywords: ['family', 'maintenance', 'dower'],
  },
];

const CaseLaw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseLaw[]>(sampleCases);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchCases();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setUserId(session?.user?.id || null);
  };

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from('case_laws')
      .select('*')
      .order('year', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setCases(data);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Search in database
    const { data, error } = await supabase
      .from('case_laws')
      .select('*')
      .or(`case_title.ilike.%${searchQuery}%,act_name.ilike.%${searchQuery}%,verdict_summary.ilike.%${searchQuery}%`)
      .order('year', { ascending: false });

    if (data && data.length > 0) {
      setCases(data);
    } else {
      toast({
        title: "No Results",
        description: "No case laws found matching your search. Try different keywords.",
      });
    }
    
    setIsSearching(false);
  };

  const handleBookmark = async (caseId: string) => {
    if (!isAuthenticated || !userId) {
      toast({
        title: "Login Required",
        description: "Please log in to bookmark case laws.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        case_law_id: caseId,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already Bookmarked",
          description: "This case law is already in your bookmarks.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to bookmark. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Bookmarked",
        description: "Case law added to your bookmarks.",
      });
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesYear = selectedYear === 'all' || c.year?.toString() === selectedYear;
    const matchesJurisdiction = selectedJurisdiction === 'all' || c.jurisdiction === selectedJurisdiction;
    return matchesYear && matchesJurisdiction;
  });

  const years = [...new Set(cases.map(c => c.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
  const jurisdictions = [...new Set(cases.map(c => c.jurisdiction).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
              JurisMind
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(isAuthenticated ? '/chat' : '/home')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {!isAuthenticated && (
              <Button className="glow-button bg-gradient-to-r from-primary to-primary-glow" onClick={() => navigate('/auth')}>
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Gavel className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Legal Research</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Case Law <span className="text-primary">Search</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Search Bangladesh case laws with AI-powered summaries and automatic citation generation.
            </p>
          </motion.div>

          {/* Search Section */}
          <motion.div
            className="max-w-4xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 glass-panel">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by case name, act, section, or keyword..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button
                  className="glow-button bg-gradient-to-r from-primary to-primary-glow"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search Cases
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mt-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year?.toString() || ''}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                  <SelectTrigger className="w-48">
                    <MapPin className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jurisdictions</SelectItem>
                    {jurisdictions.map(j => (
                      <SelectItem key={j} value={j || ''}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </motion.div>

          {/* Results */}
          <div className="space-y-4">
            {filteredCases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 glass-panel hover:border-primary/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10 mt-1">
                          <Gavel className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{caseItem.case_title}</h3>
                          {caseItem.case_title_bn && (
                            <p className="text-muted-foreground">{caseItem.case_title_bn}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          <FileText className="mr-1 h-3 w-3" />
                          {caseItem.act_name}
                        </Badge>
                        {caseItem.section_number && (
                          <Badge variant="outline">Section {caseItem.section_number}</Badge>
                        )}
                        {caseItem.year && (
                          <Badge variant="outline">
                            <Calendar className="mr-1 h-3 w-3" />
                            {caseItem.year}
                          </Badge>
                        )}
                        {caseItem.jurisdiction && (
                          <Badge variant="outline">
                            <MapPin className="mr-1 h-3 w-3" />
                            {caseItem.jurisdiction}
                          </Badge>
                        )}
                      </div>

                      {caseItem.citation && (
                        <p className="text-sm font-mono text-primary mb-2">
                          Citation: {caseItem.citation}
                        </p>
                      )}

                      {caseItem.verdict_summary && (
                        <p className="text-muted-foreground text-sm mb-2">
                          {caseItem.verdict_summary}
                        </p>
                      )}

                      {caseItem.verdict_summary_bn && (
                        <p className="text-muted-foreground text-sm">
                          {caseItem.verdict_summary_bn}
                        </p>
                      )}

                      {caseItem.keywords && caseItem.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {caseItem.keywords.map(keyword => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex lg:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBookmark(caseItem.id)}
                      >
                        <Bookmark className="mr-2 h-4 w-4" />
                        Bookmark
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredCases.length === 0 && (
            <div className="text-center py-12">
              <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No case laws found. Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            <span className="font-bold text-primary">JurisMind</span> — Created by RONY
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CaseLaw;
