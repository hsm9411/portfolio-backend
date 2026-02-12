/**
 * OAuth Provider로부터 받아오는 사용자 정보 인터페이스
 */
export interface OAuthUser {
  /**
   * OAuth Provider (google, github 등)
   */
  provider: 'google' | 'github';

  /**
   * Provider에서 제공하는 고유 ID
   * - Google: sub (Subject Identifier)
   * - GitHub: id
   */
  providerId: string;

  /**
   * 사용자 이메일
   */
  email: string;

  /**
   * 사용자 이름
   * - Google: name
   * - GitHub: login
   */
  name: string;

  /**
   * 프로필 사진 URL (선택)
   */
  picture?: string;

  /**
   * OAuth Access Token (선택 - 추후 API 호출용)
   */
  accessToken?: string;

  /**
   * OAuth Refresh Token (선택 - 토큰 갱신용)
   */
  refreshToken?: string;
}
