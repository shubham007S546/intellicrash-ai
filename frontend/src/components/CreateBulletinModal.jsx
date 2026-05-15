import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Video, X, Send, Image as ImageIcon, Video as VideoIcon, Upload } from "lucide-react";

export default function CreateBulletinModal({ isOpen, onClose, onPost }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedMedia(imageSrc); // This is Base64
      setMediaType('image');
      setIsCapturing(false);
    }
  }, [webcamRef]);

  const handleStartCaptureClick = useCallback(() => {
    setMediaType('image');
    setIsCapturing(true);
    setCapturedMedia(null);
  }, []);

  const handleStartVideoClick = useCallback(() => {
    setMediaType('video');
    setIsCapturing(true);
    setCapturedMedia(null);
  }, []);

  const handleDataAvailable = useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleStartRecording = useCallback(() => {
    setRecording(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: "video/webm"
    });
    mediaRecorderRef.current.addEventListener(
      "dataavailable",
      handleDataAvailable
    );
    mediaRecorderRef.current.start();
  }, [webcamRef, setRecording, mediaRecorderRef, handleDataAvailable]);

  const handleStopRecording = useCallback(() => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }, [mediaRecorderRef, setRecording]);

  const handleDownload = useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedMedia(reader.result); // Base64
        setRecordedChunks([]);
        setIsCapturing(false);
      };
      reader.readAsDataURL(blob);
    }
  }, [recordedChunks]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedMedia(reader.result);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        setIsCapturing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!description) return;
    await onPost({
      id: Date.now(),
      headline: title,
      description,
      type: category,
      image_url: mediaType === 'image' ? capturedMedia : null,
      video_url: mediaType === 'video' ? capturedMedia : null,
      reporter: "Community Member",
      timestamp: new Date().toISOString(),
      severity: "moderate",
      source: "community"
    });
    
    setIsSuccess(true);
  };

  const handleFinalClose = () => {
    setIsSuccess(false);
    setTitle("");
    setDescription("");
    setCapturedMedia(null);
    setMediaType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(5px)"
    }}>
      <div style={{
        background: "var(--bg-card, #fff)", width: "90%", maxWidth: 500,
        borderRadius: 20, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        border: "1px solid var(--border, #e2e8f0)", color: "var(--text-primary, #000)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isSuccess ? "Submission Successful" : "Post to Community"}</h2>
          <button onClick={handleFinalClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <X size={24} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", background: "#22c55e", 
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", 
              margin: "0 auto 20px", fontSize: 40, boxShadow: "0 10px 25px rgba(34,197,94,0.3)"
            }}>
              ✓
            </div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: "0 0 8px" }}>Check Complete!</p>
            <p style={{ color: "var(--text-secondary, #64748b)", fontSize: 14, marginBottom: 24 }}>
              Your incident report has been posted to the bulletin.
            </p>
            <button onClick={handleFinalClose} style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", 
              fontWeight: 700, cursor: "pointer"
            }}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            placeholder="Title (Optional — AI will auto-generate if blank)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: "var(--bg-primary, #f8f8fc)", color: "inherit"
            }}
          />
          <textarea
            placeholder="What's happening?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: "var(--bg-primary, #f8f8fc)", color: "inherit", minHeight: 100, resize: "none"
            }}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: "var(--bg-primary, #f8f8fc)", color: "inherit"
            }}
          >
            <option value="general">General</option>
            <option value="accident">Accident</option>
            <option value="traffic">Traffic</option>
            <option value="roadblock">Roadblock</option>
            <option value="hazard">Hazard</option>
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleStartCaptureClick} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: mediaType === 'image' ? "var(--accent, #ff4d00)" : "transparent",
              color: mediaType === 'image' ? "#fff" : "inherit", cursor: "pointer"
            }}>
              <Camera size={18} /> Photo
            </button>
            <button onClick={handleStartVideoClick} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: mediaType === 'video' ? "var(--accent, #ff4d00)" : "transparent",
              color: mediaType === 'video' ? "#fff" : "inherit", cursor: "pointer"
            }}>
              <Video size={18} /> Video
            </button>
            <label style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px", borderRadius: 10, border: "1px solid var(--border, #e2e8f0)",
              background: "transparent", color: "inherit", cursor: "pointer"
            }}>
              <Upload size={18} /> Upload
              <input 
                type="file" 
                accept="image/*,video/*" 
                hidden 
                onChange={handleFileUpload} 
              />
            </label>
          </div>

          {isCapturing && (
            <div style={{ borderRadius: 15, overflow: "hidden", position: "relative" }}>
              <Webcam
                audio={mediaType === 'video'}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
              />
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }}>
                {mediaType === 'image' ? (
                  <button onClick={handleCapture} style={{
                    padding: "8px 20px", borderRadius: 20, background: "#ff4d00", color: "#fff", border: "none", cursor: "pointer"
                  }}>Capture</button>
                ) : (
                  <>
                    {!recording ? (
                      <button onClick={handleStartRecording} style={{
                        padding: "8px 20px", borderRadius: 20, background: "#ff4d00", color: "#fff", border: "none", cursor: "pointer"
                      }}>Start</button>
                    ) : (
                      <button onClick={handleStopRecording} style={{
                        padding: "8px 20px", borderRadius: 20, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer"
                      }}>Stop</button>
                    )}
                    {recordedChunks.length > 0 && !recording && (
                      <button onClick={handleDownload} style={{
                        padding: "8px 20px", borderRadius: 20, background: "#22c55e", color: "#fff", border: "none", cursor: "pointer"
                      }}>Use Video</button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {capturedMedia && !isCapturing && (
            <div style={{ position: "relative", borderRadius: 15, overflow: "hidden" }}>
              {mediaType === 'image' ? (
                <img src={capturedMedia} alt="Captured" style={{ width: "100%" }} />
              ) : (
                <video src={capturedMedia} controls style={{ width: "100%" }} />
              )}
              <button onClick={() => setCapturedMedia(null)} style={{
                position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff",
                border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <X size={18} />
              </button>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!title || !description}
            style={{
              marginTop: 10, padding: "14px", borderRadius: 12, border: "none",
              background: (!title || !description) ? "#ccc" : "linear-gradient(135deg,#ff4d00,#ff8c42)",
              color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}
          >
            <Send size={18} /> Post Bulletin
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
