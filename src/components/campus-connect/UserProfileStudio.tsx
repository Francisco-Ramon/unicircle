import React, { useState, useRef } from "react";
import { User, Camera, ShieldCheck, Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Edit3, Save, Upload, Settings, Globe, Share2 } from "lucide-react";
import { StudentProfileData } from "./RegistrationWizard";
import { GlobalUniversitySearch } from "./GlobalUniversitySearch";
import { uploadToStorage, upsertLiveProfile } from "@/lib/supabaseLiveService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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
  const [showUniSearch, setShowUniSearch] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);

  const [firstName, setFirstName] = useState(profile.firstName || "Student");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [course, setCourse] = useState(profile.course || "Computer Science");
  const [yearOfStudy, setYearOfStudy] = useState(profile.yearOfStudy || "3rd Year");
  const [gender, setGender] = useState(profile.gender || "Male");
  const [relationshipGoal, setRelationshipGoal] = useState(profile.relationshipGoal || "Friendship");
  const [interestsInput, setInterestsInput] = useState(profile.interests ? profile.interests.join(", ") : "Campus Events, Tech");

  // Sync state whenever parent profile updates (e.g. from Supabase)
  React.useEffect(() => {
    if (profile.photos && profile.photos.length > 0) {
      setPhotos(profile.photos);
    }
    if (profile.bio) {
      setBio(profile.bio);
    }
    if (profile.firstName) setFirstName(profile.firstName);
    if (profile.lastName) setLastName(profile.lastName);
    if (profile.course) setCourse(profile.course);
    if (profile.yearOfStudy) setYearOfStudy(profile.yearOfStudy);
    if (profile.gender) setGender(profile.gender);
    if (profile.relationshipGoal) setRelationshipGoal(profile.relationshipGoal);
    if (profile.interests) setInterestsInput(profile.interests.join(", "));
  }, [profile]);

  const handleSaveFullDetails = () => {
    const updatedInterests = interestsInput
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const updatedProfile: StudentProfileData = {
      ...profile,
      firstName: firstName.trim() || "Student",
      lastName: lastName.trim(),
      nickname: firstName.trim() || "Student",
      course: course.trim() || "Student",
      yearOfStudy,
      gender: gender as any,
      relationshipGoal,
      interests: updatedInterests.length > 0 ? updatedInterests : ["Campus Events", "Networking"],
      bio,
      photos,
    };

    onUpdateProfile(updatedProfile);
    setShowEditDetailsModal(false);
    toast.success("Profile details updated and broadcasted to campus network!");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setIsUploadingPhoto(true);
      
      // Upload to Supabase Storage Bucket 'avatars' with Base64 fallback
      const finalUrl = await uploadToStorage(file, "avatars");
      
      const updated = [...photos, finalUrl];
      setPhotos(updated);
      setIsUploadingPhoto(false);
      
      const updatedProfile = { ...profile, photos: updated };
      onUpdateProfile(updatedProfile);

      // Save to Supabase profiles table if logged in
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        await upsertLiveProfile({
          id: authUser.user.id,
          photos: updated,
        });
      }
    }
  };

  const handleRemovePhoto = (idx: number) => {
    if (photos.length <= 1) {
      alert("At least 1 photo is required for your student profile.");
      return;
    }
    const updated = photos.filter((_, i) => i !== idx);
    setPhotos(updated);

    if (activeViewerIndex !== null) {
      if (updated.length === 0) {
        setActiveViewerIndex(null);
      } else if (activeViewerIndex >= updated.length) {
        setActiveViewerIndex(updated.length - 1);
      }
    }

    onUpdateProfile({ ...profile, photos: updated });
  };

  const handleSaveBio = () => {
    onUpdateProfile({ ...profile, bio, photos });
    setIsEditing(false);
  };

  const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);

  const handleShareProfile = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://unicircle.app";
    const shareUrl = `${origin}/auth`;
    const shareData = {
      title: `Connect with ${profile.firstName} on UniCircle`,
      text: `Hey! I'm on UniCircle, the verified campus social network for East Africa. Connect and chat with me:`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // user cancelled share
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("UniCircle invite link copied! Share it on WhatsApp, X, or Instagram! 🚀");
    }
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
          {/* Avatar with Verified Badge — tap to view full size */}
          <div
            onClick={() => setActiveViewerIndex(0)}
            className="relative w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-xl shrink-0 cursor-pointer group"
          >
            <img
              src={photos[0]}
              alt={profile.firstName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80";
              }}
              className="w-full h-full object-cover rounded-xl group-hover:opacity-90 transition"
            />
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
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-indigo-300 font-semibold">
                    {profile.campus} ({profile.country || "Kenya"})
                  </p>
                  <button
                    onClick={() => setShowUniSearch(true)}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-600/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Globe className="w-3 h-3 text-indigo-400" /> Change
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{profile.course} • {profile.yearOfStudy}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => setShowEditDetailsModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                  title="Edit your name, course, goals, and details"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>

                <button
                  onClick={handleShareProfile}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-xs font-bold text-indigo-300 transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Share profile or invite friends to chat"
                >
                  <Share2 className="w-4 h-4 text-indigo-400" /> Share & Invite
                </button>

                {onNavigateToSettings && (
                  <button
                    onClick={onNavigateToSettings}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-indigo-400" /> Settings
                  </button>
                )}
              </div>
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
            <h3 className="text-sm font-bold text-white">Profile Photos ({photos.length})</h3>
            <p className="text-xs text-slate-400">Tap any photo to view or remove (minimum 1 photo required)</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" /> Add Photo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setActiveViewerIndex(idx)}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden group border border-white/10 cursor-pointer shadow-md"
            >
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80";
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

              {/* Remove Photo Trash Button */}
              {photos.length > 1 ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemovePhoto(idx); }}
                  className="absolute top-2 right-2 p-2 rounded-xl bg-slate-950/80 hover:bg-red-600 text-white transition border border-white/15 cursor-pointer shadow-lg"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
                </button>
              ) : (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/80 text-[9px] font-bold text-slate-400 border border-white/10">
                  Primary 1/1
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Photo Lightbox / Viewer Modal */}
      {activeViewerIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveViewerIndex(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[activeViewerIndex]}
              alt="Viewing photo"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80";
              }}
              className="w-full max-h-[70vh] object-cover"
            />    {/* Close Button */}
            <button
              onClick={() => setActiveViewerIndex(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 hover:bg-white/20 text-white transition"
            >
              ✕
            </button>

            {/* Photo Counter */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-bold text-white flex items-center gap-2">
              <span>Photo {activeViewerIndex + 1} of {photos.length}</span>
            </div>

            {/* Main Image */}
            <div className="aspect-[3/4] max-h-[65vh] w-full bg-black relative flex items-center justify-center">
              <img
                src={photos[activeViewerIndex]}
                alt={`Photo ${activeViewerIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Prev / Next buttons */}
              {activeViewerIndex > 0 && (
                <button
                  onClick={() => setActiveViewerIndex(activeViewerIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition"
                >
                  ◀
                </button>
              )}
              {activeViewerIndex < photos.length - 1 && (
                <button
                  onClick={() => setActiveViewerIndex(activeViewerIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition"
                >
                  ▶
                </button>
              )}
            </div>

            {/* Lightbox Footer controls with Remove option */}
            <div className="p-4 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <div className="flex gap-2 overflow-x-auto">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveViewerIndex(i)}
                    className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      i === activeViewerIndex ? "border-indigo-500 scale-105" : "border-transparent opacity-50"
                    }`}
                  >
                    <img src={url} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Delete / Remove button */}
              {photos.length > 1 ? (
                <button
                  onClick={() => handleRemovePhoto(activeViewerIndex)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" /> Remove Photo
                </button>
              ) : (
                <span className="text-[11px] font-bold text-slate-500">At least 1 photo required</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Worldwide University Search Modal */}
      {showUniSearch && (
        <GlobalUniversitySearch
          title="Change University Worldwide"
          currentUniversityName={profile.campus}
          onSelectInstitution={(inst) => {
            onUpdateProfile({
              ...profile,
              campus: inst.name,
              country: inst.country,
              institutionId: inst.id,
            });
            setShowUniSearch(false);
          }}
          onClose={() => setShowUniSearch(false)}
        />
      )}
      {showEditDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" /> Edit Student Profile
              </h3>
              <button
                onClick={() => setShowEditDetailsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Jomba"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Otieno"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Course / Degree */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Major / Course</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Computer Science, Law, Medicine"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Year of Study & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Year of Study</label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                  </select>
                </div>
              </div>

              {/* Relationship Goal */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Campus Goal</label>
                <select
                  value={relationshipGoal}
                  onChange={(e) => setRelationshipGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Friendship">Friendship & Study Buddies</option>
                  <option value="Dating">Campus Dating & Romance</option>
                  <option value="Networking">Career & Startup Networking</option>
                  <option value="Anything">Open to Anything</option>
                </select>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Interests & Hobbies (comma separated)</label>
                <input
                  type="text"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="e.g. Tech, Football, Debate, Music"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Bio Description */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Bio / Introduction</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell campus about yourself..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEditDetailsModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFullDetails}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Save & Update Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
