import React, { useState, useRef } from "react";
import { User, Camera, ShieldCheck, Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Edit3, Save, Upload, Settings } from "lucide-react";
import { StudentProfileData } from "./RegistrationWizard";

interface Props {
  profile: StudentProfileData;
  onUpdateProfile: (updated: StudentProfileData) => void;
  onLaunchLivenessScan: () => void;
  onNavigateToSettings?: () => void;
}

export const UserProfileStudio: React.FC<Props> = ({
  profile,
  onUpdateProfile,
  onLaunchLivenessScan,
  onNavigateToSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(
    profile.photos && profile.photos.length > 0
      ? profile.photos
      : [
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        ]
  );

  const [bio, setBio] = useState(profile.bio || "CS major passionate about neural networks, late night coffee runs, and weekend hiking trips.");
  const [isEditing, setIsEditing] = useState(false);

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

  const handleRemovePhoto = (idx: number) => {
    if (photos.length <= 1) {
      alert("Account requires at least 1 photo for verified student profiles.");
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
    <div className="w-full max-w-3xl mx-auto space-y-6 py-2">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Profile Overview Card */}
      <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar with Verified Badge */}
          <div className="relative w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-xl shrink-0">
            <img src={photos[0]} alt={profile.firstName} className="w-full h-full object-cover rounded-xl" />
            <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-emerald-500 rounded-xl text-slate-950 shadow-lg" title="Verified Student Account">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  {profile.firstName} {profile.lastName}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Student
                  </span>
                </h2>
                <p className="text-xs text-indigo-300 font-semibold mt-1">
                  {profile.campus} ({profile.country || "Kenya"})
                </p>
                <p className="text-xs text-slate-400">{profile.course} • {profile.yearOfStudy}</p>
              </div>

              {onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition flex items-center gap-1.5 shrink-0"
                >
                  <Settings className="w-4 h-4 text-indigo-400" /> Settings
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                Goal: {profile.relationshipGoal}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-medium">
                Gender: {profile.gender}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-medium">
                Orientation: {profile.orientation}
              </span>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <button onClick={handleSaveBio} className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            )}
          </div>

          {!isEditing ? (
            <p className="text-sm text-slate-200 leading-relaxed">{bio}</p>
          ) : (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>
      </div>

      {/* Photo Gallery Studio */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Profile Photos</h3>
            <p className="text-xs text-slate-400">Add photos to show your campus lifestyle</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Photo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((url, idx) => (
            <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden group border border-white/10">
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
