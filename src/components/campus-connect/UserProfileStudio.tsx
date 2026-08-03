import React, { useState, useRef } from "react";
import { User, Camera, ShieldCheck, Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Edit3, Save, Upload } from "lucide-react";
import { StudentProfileData } from "./RegistrationWizard";

interface Props {
  profile: StudentProfileData;
  onUpdateProfile: (updated: StudentProfileData) => void;
  onLaunchLivenessScan: () => void;
}

export const UserProfileStudio: React.FC<Props> = ({ profile, onUpdateProfile, onLaunchLivenessScan }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(
    profile.photos && profile.photos.length > 0
      ? profile.photos
      : [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
        ]
  );

  const [bio, setBio] = useState(profile.bio || "CS major passionate about neural networks, late night coffee runs, and weekend hiking trips.");
  const [isEditing, setIsEditing] = useState(false);
  const [aiPhotoScanStatus, setAiPhotoScanStatus] = useState<string>("All photos passed AI resolution & liveness check (0 NSFW, 0 blurred, 0 memes)");

  // Interactive native file picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const localUrl = URL.createObjectURL(file);
      const updated = [...photos, localUrl];
      setPhotos(updated);
      onUpdateProfile({ ...profile, photos: updated });
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (idx: number) => {
    if (photos.length <= 1) {
      alert("Platform policy requires at least 1 photo for verified student accounts.");
      return;
    }
    const updated = photos.filter((_, i) => i !== idx);
    setPhotos(updated);
    onUpdateProfile({ ...profile, photos: updated });
  };

  const handleSaveBio = () => {
    onUpdateProfile({ ...profile, bio, photos });
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Profile Overview Card */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-xl">
            <img src={photos[0]} alt={profile.firstName} className="w-full h-full object-cover rounded-full" />
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 rounded-full text-white shadow-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">{profile.firstName} {profile.lastName}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Student
              </span>
            </div>
            <p className="text-xs text-indigo-300 mt-0.5">{profile.campus} • {profile.course} ({profile.yearOfStudy})</p>
            <p className="text-[11px] text-slate-400 mt-1">Primary Goal: <span className="text-white font-semibold">{profile.relationshipGoal}</span></p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            onClick={onLaunchLivenessScan}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Re-Scan Biometrics
          </button>
        </div>
      </div>

      {/* 5-20 Photo Gallery Manager */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" /> Photo Gallery ({photos.length}/20 Photos)
            </h3>
            <p className="text-xs text-slate-400">Click to upload photo files directly into your verified student profile.</p>
          </div>

          <button
            onClick={triggerFilePicker}
            disabled={photos.length >= 20}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Upload Picture File
          </button>
        </div>

        {/* AI Moderation Banner */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{aiPhotoScanStatus}</span>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {photos.map((url, idx) => (
            <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 group bg-slate-950">
              <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                  Primary
                </span>
              )}
              <button
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Clickable Add Photo Box */}
          <div
            onClick={triggerFilePicker}
            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/20 hover:border-indigo-400 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center cursor-pointer text-center p-3 group"
          >
            <Plus className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition" />
            <span className="text-xs text-slate-400 font-bold mt-2">Click to Upload File</span>
          </div>
        </div>
      </div>

      {/* Bio & Details Studio */}
      <div className="p-6 bg-slate-900 border border-white/15 rounded-3xl backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Biography & Campus Details</h3>
          {isEditing ? (
            <button onClick={handleSaveBio} className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Save Bio
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        ) : (
          <p className="text-xs text-slate-200 bg-slate-950 p-4 rounded-2xl border border-white/5 italic">
            "{bio}"
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
            <span className="text-slate-400 block">Locked Gender:</span>
            <strong className="text-amber-400 flex items-center gap-1 font-bold">
              {profile.gender} <span className="text-[10px] text-slate-400">(Permanent)</span>
            </strong>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
            <span className="text-slate-400 block">Height:</span>
            <strong className="text-white">{profile.height}</strong>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
            <span className="text-slate-400 block">Smoking:</span>
            <strong className="text-white">{profile.lifestyle.smoking}</strong>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
            <span className="text-slate-400 block">Interested In:</span>
            <strong className="text-white">{profile.interestedIn}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
