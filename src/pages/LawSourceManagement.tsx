import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Upload, Search, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LawSourceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [laws, setLaws] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLaw, setNewLaw] = useState({
    law_title: "",
    act_number: "",
    year: "",
    section_number: "",
    section_content: "",
    law_title_bn: "",
    section_content_bn: ""
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const admin = roles?.some(r => r.role === 'admin');
    setIsAdmin(admin || false);

    if (!admin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    await fetchLaws();
    await fetchSyncLogs();
    setLoading(false);
  };

  const fetchLaws = async () => {
    const { data, error } = await supabase
      .from('bangladesh_laws')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching laws:', error);
      toast({
        title: "Error",
        description: "Failed to load laws",
        variant: "destructive",
      });
    } else {
      setLaws(data || []);
    }
  };

  const fetchSyncLogs = async () => {
    const { data } = await supabase
      .from('law_source_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(10);

    setSyncLogs(data || []);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await fetchLaws();
      return;
    }

    const { data } = await supabase
      .from('bangladesh_laws')
      .select('*')
      .or(`law_title.ilike.%${searchQuery}%,section_content.ilike.%${searchQuery}%`)
      .limit(50);

    setLaws(data || []);
  };

  const handleAddLaw = async () => {
    if (!newLaw.law_title || !newLaw.section_content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('bangladesh_laws').insert({
      ...newLaw,
      year: newLaw.year ? parseInt(newLaw.year) : null
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add law",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Law added successfully",
      });
      setShowAddForm(false);
      setNewLaw({
        law_title: "",
        act_number: "",
        year: "",
        section_number: "",
        section_content: "",
        law_title_bn: "",
        section_content_bn: ""
      });
      await fetchLaws();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('bangladesh_laws')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete law",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Law deleted successfully",
      });
      await fetchLaws();
    }
  };

  const handleSyncFromWebsite = async () => {
    toast({
      title: "Sync Started",
      description: "Web scraping feature coming soon. Please add laws manually for now.",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Bangladesh Laws Source Management</h1>
        </div>

        <div className="grid gap-6 mb-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleSyncFromWebsite}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from bdlaws.minlaw.gov.bd
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Law Manually
              </Button>
            </div>
          </Card>

          {showAddForm && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Law</h2>
              <div className="grid gap-4">
                <Input
                  placeholder="Law Title (English)"
                  value={newLaw.law_title}
                  onChange={(e) => setNewLaw({...newLaw, law_title: e.target.value})}
                />
                <Input
                  placeholder="Law Title (Bangla)"
                  value={newLaw.law_title_bn}
                  onChange={(e) => setNewLaw({...newLaw, law_title_bn: e.target.value})}
                />
                <Input
                  placeholder="Act Number"
                  value={newLaw.act_number}
                  onChange={(e) => setNewLaw({...newLaw, act_number: e.target.value})}
                />
                <Input
                  placeholder="Year"
                  type="number"
                  value={newLaw.year}
                  onChange={(e) => setNewLaw({...newLaw, year: e.target.value})}
                />
                <Input
                  placeholder="Section Number"
                  value={newLaw.section_number}
                  onChange={(e) => setNewLaw({...newLaw, section_number: e.target.value})}
                />
                <Textarea
                  placeholder="Section Content (English)"
                  value={newLaw.section_content}
                  onChange={(e) => setNewLaw({...newLaw, section_content: e.target.value})}
                  rows={6}
                />
                <Textarea
                  placeholder="Section Content (Bangla)"
                  value={newLaw.section_content_bn}
                  onChange={(e) => setNewLaw({...newLaw, section_content_bn: e.target.value})}
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddLaw}>Save Law</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Search Laws</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Laws Database ({laws.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {laws.map((law) => (
                <Card key={law.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{law.law_title}</h3>
                      {law.law_title_bn && (
                        <p className="text-sm text-muted-foreground">{law.law_title_bn}</p>
                      )}
                      <p className="text-sm mt-2">
                        <span className="font-medium">Act: </span>{law.act_number} | 
                        <span className="font-medium"> Year: </span>{law.year} |
                        <span className="font-medium"> Section: </span>{law.section_number}
                      </p>
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-3">
                        {law.section_content}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(law.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Sync History</h2>
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex justify-between text-sm p-2 border-b">
                  <span>{new Date(log.sync_started_at).toLocaleString()}</span>
                  <span>Status: {log.status}</span>
                  <span>Laws: {log.total_laws_synced}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}