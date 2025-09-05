// Mock navigation types for development
export interface MockNavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  push: (screen: string, params?: any) => void;
  pop: (count?: number) => void;
  popToTop: () => void;
  replace: (screen: string, params?: any) => void;
  reset: (state: any) => void;
  setParams: (params: any) => void;
  dispatch: (action: any) => void;
  isFocused: () => boolean;
  canGoBack: () => boolean;
  getId: () => string | undefined;
  getParent: () => any;
  getState: () => any;
}

export type StackNavigationProp<T, K extends keyof T> = MockNavigationProp;