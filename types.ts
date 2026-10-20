export type Msg = { id: string; from: 'me' | 'them'; text: string; time: string };
export type Call = { id: string; name: string; avatar: string; type: 'incoming' | 'outgoing' | 'missed'; time: string; duration: string };
export type Thread = { id: string; name: string; avatar: string; messages: Msg[] };
export type Content = {
  kakao: { avatar: string; messages: Msg[] };
  gallery: string[];
  naver: string[];
  insta: { avatar: string; posts: string[] };
  calls: Call[];
  threads: Thread[];
  incoming: { name: string; avatar: string; audio: string };
};
// 제공되지 않은 콘텐츠는 비워 두고 화면에서 자리 표시자로 보여 준다.
export const emptyContent: Content = {
  kakao: { avatar: '', messages: [] },
  gallery: [],
  naver: ['남자친구 생일 선물', '연상 남자친구 선물', '남자친구 생일 이벤트'],
  insta: { avatar: '', posts: Array(9).fill('') },
  calls: [],
  threads: [],
  incoming: { name: '', avatar: '', audio: '' },
};
export const CALL_LABEL = { incoming: '수신', outgoing: '발신', missed: '부재중' } as const;
export const uid = () => Math.random().toString(36).slice(2, 10);
