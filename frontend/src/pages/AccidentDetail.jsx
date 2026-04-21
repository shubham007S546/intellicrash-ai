/**
 * AccidentDetail.jsx
 * Shown when user clicks on a community report/accident from the bulletin
 * Users can add photos, suggestions, descriptions → earn points
 * Shows on bulletin/home page as info cards
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Button, Card, CardContent,
  TextField, Grid, Chip, Avatar, LinearProgress, Alert,
  Snackbar, Divider, Stack, IconButton, Paper,
} from "@mui/material";
import {
  ArrowBack, LocationOn, Warning, PhotoCamera,
  Send, ThumbUp, Person, AccessTime, DirectionsCar,
} from "@mui/icons-material";
import { getReports, addReport, saveGM, initGM } from "../services/api";
import { compressImages } from "../services/imageUtils";

// ── Language strings ───────────────────────────────────────────
const T = {
  en: {
    back: "Back to Reports",
    title: "Accident Report",
    location: "Location",
    time: "Reported at",
    description: "What Happened",
    severity: "Severity",
    injured: "People Injured",
    photos: "Photos from Scene",
    contribute: "Add Your Info (Optional)",
    contributeNote: "Your contribution helps keep others safe. +15 pts for contributing.",
    yourDesc: "What did you see? (optional)",
    addPhoto: "Add Photo",
    submit: "Submit Contribution (+15 pts)",
    submitted: "Thank you! Your info helps keep roads safe. +15 pts added.",
    noReport: "Report not found.",
    suggestions: "Community Suggestions",
    noSugg: "No suggestions yet. Be first to help!",
    road: "Road",
    agency: "Road Agency",
    district: "District",
  },
  hi: {
    back: "रिपोर्ट पर वापस जाएं",
    title: "दुर्घटना रिपोर्ट",
    location: "स्थान",
    time: "रिपोर्ट का समय",
    description: "क्या हुआ",
    severity: "गंभीरता",
    injured: "घायल लोग",
    photos: "घटनास्थल की तस्वीरें",
    contribute: "अपनी जानकारी जोड़ें (वैकल्पिक)",
    contributeNote: "आपकी जानकारी दूसरों को सुरक्षित रखती है। योगदान के लिए +15 अंक।",
    yourDesc: "आपने क्या देखा? (वैकल्पिक)",
    addPhoto: "फोटो जोड़ें",
    submit: "जानकारी भेजें (+15 अंक)",
    submitted: "धन्यवाद! आपकी जानकारी सड़कों को सुरक्षित बनाती है। +15 अंक जोड़े गए।",
    noReport: "रिपोर्ट नहीं मिली।",
    suggestions: "समुदाय के सुझाव",
    noSugg: "अभी तक कोई सुझाव नहीं। मदद करने वाले पहले बनें!",
    road: "सड़क",
    agency: "सड़क एजेंसी",
    district: "जिला",
  }
};

const sevColor = (s) => s==="severe"?"#ea4335":s==="moderate"?"#f9ab00":"#34a853";
const sevLabel = { severe:"Severe / गंभीर", moderate:"Moderate / मध्यम", minor:"Minor / मामूली" };
const typeIcon = { accident:"💥", traffic:"🚦", roadblock:"🚧", hazard:"⚠️" };

export default function AccidentDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const lang    = localStorage.getItem("ic_lang") || "en";
  const t       = T[lang] || T.en;
  const fileRef = useRef(null);

  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [myDesc,    setMyDesc]    = useState("");
  const [myPhotos,  setMyPhotos]  = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [snack,     setSnack]     = useState(null);

  useEffect(() => {
    getReports().then(d => {
      const all = d.reports || [];
      const found = all.find(r => String(r.id) === String(id));
      setReport(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handlePhoto = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    try {
      const compressed = await compressImages(files, 4 - myPhotos.length, 800, 0.7);
      setMyPhotos(p => [...p, ...compressed.map((url, i) => ({ name: files[i]?.name || `photo_${i}`, url }))].slice(0, 4));
    } catch {
      // fallback to uncompressed
      const readers = Array.from(files).map(f => new Promise(res => {
        const r = new FileReader(); r.onload = () => res({ name: f.name, url: r.result }); r.readAsDataURL(f);
      }));
      Promise.all(readers).then(imgs => setMyPhotos(p => [...p, ...imgs].slice(0, 4)));
    }
  };

  const handleSubmit = async () => {
    if (!myDesc.trim() && myPhotos.length === 0) {
      setSnack({ msg: "Please add a description or photo.", sev: "warning" });
      return;
    }
    try {
      // Add contribution as a linked report
      await addReport({
        type: "contribution",
        lat: report.lat, lon: report.lon,
        description: myDesc,
        photos: myPhotos.map(p => p.url),
        parent_id: id,
        timestamp: new Date().toISOString(),
      });
      // Add points
      const gm = initGM();
      gm.points = (gm.points || 0) + 15;
      gm.reports = (gm.reports || 0) + 1;
      saveGM(gm);
      setSubmitted(true);
      setSnack({ msg: t.submitted, sev: "success" });
    } catch {
      setSnack({ msg: "Saved locally. Thank you!", sev: "info" });
      setSubmitted(true);
    }
  };

  if (loading) return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <LinearProgress sx={{ maxWidth: 300, mx: "auto" }} />
    </Box>
  );

  if (!report) return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <Typography color="text.secondary">{t.noReport}</Typography>
      <Button onClick={() => nav(-1)} startIcon={<ArrowBack />} sx={{ mt: 2 }}>{t.back}</Button>
    </Box>
  );

  return (
    <Box sx={{ background: "#f0f4ff", minHeight: "calc(100vh - 58px)" }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg,${sevColor(report.severity || "moderate")},${sevColor(report.severity || "moderate")}cc)`, py: 2.5, px: 3 }}>
        <Container maxWidth="lg">
          <Button onClick={() => nav(-1)} startIcon={<ArrowBack />} sx={{ color: "#fff", mb: 1, "&:hover": { background: "rgba(255,255,255,0.1)" } }}>
            {t.back}
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontSize: 36 }}>{typeIcon[report.type] || "⚠️"}</Typography>
            <Box>
              <Typography variant="h5" sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#fff", textTransform: "capitalize" }}>
                {report.type || "Incident"} Report
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                <LocationOn sx={{ fontSize: 14, verticalAlign: "middle" }} />
                {report.landmark || report.description?.slice(0, 50) || `${report.lat?.toFixed(4)}, ${report.lon?.toFixed(4)}`}
              </Typography>
            </Box>
            {report.severity && (
              <Chip label={sevLabel[report.severity] || report.severity} sx={{ ml: "auto", background: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700 }} />
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={3}>

          {/* ── LEFT: Report details ── */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2.5}>

              {/* Key facts */}
              <Card elevation={0} sx={{ border: "1px solid #e3eaf5", borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, mb: 2 }}>📋 {t.title}</Typography>
                  <Grid container spacing={2}>
                    {[
                      [<LocationOn sx={{ color: "#ea4335" }} />, t.location, report.landmark || `${report.lat?.toFixed(4)}, ${report.lon?.toFixed(4)}`],
                      [<AccessTime sx={{ color: "#1a73e8" }} />, t.time, report.timestamp?.slice(0, 19).replace("T", " ") || "—"],
                      [<Warning sx={{ color: sevColor(report.severity) }} />, t.severity, sevLabel[report.severity] || "—"],
                      [<Person sx={{ color: "#7c3aed" }} />, t.injured, report.injured > 0 ? `${report.injured} people` : "Not reported"],
                      [<DirectionsCar sx={{ color: "#0097a7" }} />, t.road, `${report.road || "—"}`],
                    ].map(([icon, label, val], i) => (
                      <Grid item xs={6} key={i}>
                        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                          {icon}
                          <Box>
                            <Typography sx={{ fontSize: 11, color: "#80868b", fontWeight: 600, textTransform: "uppercase" }}>{label}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{val}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {report.description && (
                    <Box sx={{ mt: 2, p: 2, background: "#f8faff", borderRadius: 2, border: "1px solid #e3eaf5" }}>
                      <Typography sx={{ fontSize: 11, color: "#80868b", mb: 0.5, fontWeight: 600 }}>{t.description.toUpperCase()}</Typography>
                      <Typography sx={{ fontSize: 14, color: "#1a1a1a", lineHeight: 1.65 }}>{report.description}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Photos from original report */}
              {report.photos?.length > 0 && (
                <Card elevation={0} sx={{ border: "1px solid #e3eaf5", borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, mb: 2 }}>📷 {t.photos}</Typography>
                    <Grid container spacing={1.5}>
                      {report.photos.map((ph, i) => (
                        <Grid item xs={6} sm={4} key={i}>
                          <img src={ph} alt={`Scene ${i + 1}`} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, border: "1px solid #e3eaf5", cursor: "pointer" }} onClick={() => window.open(ph, "_blank")} />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Community suggestions */}
              <Card elevation={0} sx={{ border: "1px solid #e3eaf5", borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, mb: 1.5 }}>💬 {t.suggestions}</Typography>
                  {(report.contributions || []).length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: "#80868b", textAlign: "center", py: 2 }}>{t.noSugg}</Typography>
                  ) : (report.contributions || []).map((c, i) => (
                    <Box key={i} sx={{ p: 1.5, mb: 1, background: "#f8faff", borderRadius: 2, border: "1px solid #e3eaf5" }}>
                      <Typography sx={{ fontSize: 13, color: "#1a1a1a" }}>{c.description}</Typography>
                      {c.photos?.length > 0 && (
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          {c.photos.slice(0, 3).map((p, j) => (
                            <img key={j} src={p} alt="contrib" style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 4 }} />
                          ))}
                        </Box>
                      )}
                      <Typography sx={{ fontSize: 10, color: "#80868b", mt: 0.5 }}>{c.timestamp?.slice(0, 16).replace("T", " ")}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* ── RIGHT: Contribute ── */}
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ border: `2px solid ${submitted ? "#34a853" : "#1a73e8"}44`, borderRadius: 3, position: "sticky", top: 80 }}>
              <CardContent>
                <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, mb: 0.5 }}>
                  {submitted ? "✅ Contribution Submitted!" : `✏️ ${t.contribute}`}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#80868b", mb: 2 }}>{t.contributeNote}</Typography>

                {!submitted ? (
                  <>
                    <TextField
                      multiline rows={4} fullWidth
                      placeholder={t.yourDesc}
                      value={myDesc}
                      onChange={e => setMyDesc(e.target.value)}
                      sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13 } }}
                    />

                    {/* Photo upload */}
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#80868b", textTransform: "uppercase", mb: 1 }}>
                        📷 {t.addPhoto} (optional, max 4)
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {myPhotos.map((p, i) => (
                          <Box key={i} sx={{ position: "relative", width: 72, height: 72 }}>
                            <img src={p.url} alt="my-photo" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e3eaf5" }} />
                            <IconButton size="small" onClick={() => setMyPhotos(ph => ph.filter((_, j) => j !== i))}
                              sx={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, background: "#ea4335", color: "#fff", "&:hover": { background: "#c62828" } }}>
                              <Typography sx={{ fontSize: 11, lineHeight: 1 }}>×</Typography>
                            </IconButton>
                          </Box>
                        ))}
                        {myPhotos.length < 4 && (
                          <Button onClick={() => fileRef.current.click()} variant="outlined" sx={{ width: 72, height: 72, borderRadius: 2, borderStyle: "dashed", fontSize: 11, flexDirection: "column", gap: 0.3 }}>
                            <PhotoCamera sx={{ fontSize: 20 }} />Add
                          </Button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhoto} />
                      </Box>
                    </Box>

                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}>
                      This is completely optional. Your info will be shown to all IntelliCrash users.
                    </Alert>

                    <Button fullWidth variant="contained" onClick={handleSubmit} startIcon={<Send />} sx={{ borderRadius: 2, py: 1.3, fontWeight: 700 }}>
                      {t.submit}
                    </Button>
                  </>
                ) : (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <Typography sx={{ fontSize: 48 }}>🎉</Typography>
                    <Typography sx={{ fontWeight: 700, color: "#34a853", mt: 1 }}>+15 points earned!</Typography>
                    <Typography sx={{ fontSize: 12, color: "#80868b", mt: 1 }}>Your info will help other drivers stay safe.</Typography>
                    <Button variant="outlined" onClick={() => nav(-1)} sx={{ mt: 2, borderRadius: 20 }}>
                      {t.back}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Map mini */}
            <Card elevation={0} sx={{ border: "1px solid #e3eaf5", borderRadius: 3, mt: 2.5, overflow: "hidden" }}>
              <Box sx={{ height: 200, background: "#f1f3f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Button
                  component="a"
                  href={`https://maps.google.com/?q=${report.lat},${report.lon}`}
                  target="_blank"
                  variant="contained"
                  startIcon={<LocationOn />}
                  sx={{ borderRadius: 20 }}
                >
                  Open in Google Maps
                </Button>
              </Box>
              <Box sx={{ px: 2, py: 1.5, background: "#fff" }}>
                <Typography sx={{ fontSize: 12, color: "#80868b" }}>
                  GPS: {report.lat?.toFixed(6)}, {report.lon?.toFixed(6)}
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {snack && (
        <Snackbar open autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity={snack.sev} variant="filled">{snack.msg}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
