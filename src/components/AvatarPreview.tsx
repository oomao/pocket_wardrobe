import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  className?: string;
  height?: number;
}

export default function AvatarPreview({ profile, className = '', height = 240 }: Props) {
  const url = `${import.meta.env.BASE_URL}avatars/${profile.gender}.svg`;
  return (
    <div className={`flex items-end justify-center ${className}`} style={{ height }}>
      <img
        src={url}
        alt={profile.gender}
        style={{
          height: '100%',
          transform: `scale(${profile.weightScale}, ${profile.heightScale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.15s ease',
        }}
      />
    </div>
  );
}
