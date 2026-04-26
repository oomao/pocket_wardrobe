import { profileToScales, UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  className?: string;
  height?: number;
}

export default function AvatarPreview({ profile, className = '', height = 240 }: Props) {
  const isPhoto = profile.avatarMode === 'photo' && !!profile.photoBase64;
  const url = isPhoto
    ? (profile.photoBase64 as string)
    : `${import.meta.env.BASE_URL}avatars/${profile.gender}.svg`;
  const { scaleX, scaleY } = profileToScales(profile);

  return (
    <div className={`flex items-end justify-center ${className}`} style={{ height }}>
      <img
        src={url}
        alt={isPhoto ? '我的照片' : profile.gender}
        style={{
          height: '100%',
          maxWidth: '100%',
          objectFit: 'contain',
          transform: isPhoto ? undefined : `scale(${scaleX}, ${scaleY})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.15s ease',
        }}
      />
    </div>
  );
}
