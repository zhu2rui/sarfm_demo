import React, { createContext, useState, useContext, useEffect } from 'react';
import langConfig from './langConfig';

// 创建上下文
const I18nContext = createContext();

// 语言提供者组件
export const I18nProvider = ({ children }) => {
  // 从localStorage获取语言设置，默认为中文
  const [lang, setLang] = useState(() => {
    const savedLang = localStorage.getItem('lang');
    return savedLang || 'zh';
  });

  // 切换语言
  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  // 获取当前语言的文本
  const t = (key) => {
    try {
      // 将key按.分割，如 'login.title' -> ['login', 'title']
      const keys = key.split('.');
      // 从langConfig中获取对应文本
      let result = langConfig[lang];
      for (const k of keys) {
        result = result[k];
      }
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      return key; // 如果翻译失败，返回原始key
    }
  };

  // 提供上下文值
  const contextValue = {
    lang,
    changeLang,
    t
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// 自定义Hook，方便使用上下文
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
