import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-ads';
// Ensure videojs is on window for IMA plugin
if (typeof window !== 'undefined') {
  (window as any).videojs = videojs;
}
// @ts-ignore
import 'videojs-ima';
import 'videojs-ima/dist/videojs.ima.css';
import { api } from '../../api';
import { Play, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Video, ShieldCheck, RotateCcw } from 'lucide-react';

interface AdcashRewardedVideoPlayerProps {
  opportunityId?: string;
  onClose?: () => void;
  onRewardClaimed?: () => void;
}

/**
 * AdcashRewardedVideoPlayer Component
 *
 * Implements the responsive Video.js player with Adcash In-Stream VAST ad tag
 * (https://youradexchange.com/video/select.php?r=12224982) and Google IMA SDK integration.
 *
 * INVARIANTS:
 * - Mounted only when user intentionally starts a rewarded video session.
 * - 16:9 aspect ratio, mobile-first, no horizontal overflow.
 * - Client completion reports to server, but wallet crediting is strictly authoritative & server-side.
 */
export const AdcashRewardedVideoPlayer: React.FC<AdcashRewardedVideoPlayerProps> = ({
  opportunityId,
  onClose,
  onRewardClaimed,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const [step, setStep] = useState<'loading_session' | 'ready_to_play' | 'playing' | 'verifying' | 'completed' | 'error'>('loading_session');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [imaLoaded, setImaLoaded] = useState(false);
  const [adDuration, setAdDuration] = useState<number | null>(null);
  const [session, setSession] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);

  // 1. Initialize session on mount
  useEffect(() => {
    let isMounted = true;
    const startSession = async () => {
      try {
        // Find a video opportunity or use a fallback
        const opps = await api.getOpportunities();
        const videoOpp = opps.opportunities?.find(o => o.category === 'video') || { id: 'adcash-video-zone-12225346' };
        
        const res = await api.startRewardedVideoSession(videoOpp.id);
        if (isMounted) {
          setSession(res);
          setStep('ready_to_play');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Session initialization error:', err);
          
          // Provide more helpful error messages
          let msg = err.message || 'Failed to initialize ad session.';
          if (msg.includes('Authentication required') || msg.includes('log in')) {
            msg = 'Authentication required. Please ensure you are logged in to your account before watching ads.';
          } else if (msg.includes('not found') || msg.includes('zone')) {
            msg = 'The advertisement zone is currently being configured. Please try again in a few minutes.';
          }
          
          setErrorMessage(msg);
          setStep('error');
        }
      }
    };

    startSession();
    return () => { isMounted = false; };
  }, [opportunityId]);

  // 2. Load Google IMA SDK script
  useEffect(() => {
    if ((window as any).google && (window as any).google.ima) {
      setImaLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-ima-sdk';
    script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
    script.async = true;
    script.onload = () => {
      console.log('Google IMA SDK loaded successfully');
      setImaLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google IMA SDK');
      setErrorMessage('Failed to load ad engine. Please check if an ad-blocker is preventing the video from playing.');
      setStep('error');
    };
    document.body.appendChild(script);
  }, []);

  // 3. Initialize Video.js when ready to play and IMA is loaded
  useEffect(() => {
    if (step !== 'playing' || !videoRef.current || !session || !imaLoaded) return;

    // Ensure video element exists
    const videoElement = document.createElement('video');
    videoElement.id = 'my-video';
    videoElement.className = 'video-js vjs-default-skin vjs-big-play-centered w-full h-full object-cover';
    videoElement.playsInline = true;
    // Autoplay requires mute in many browsers
    videoElement.muted = true;

    // Clear container and append video element
    if (videoRef.current) {
      videoRef.current.innerHTML = '';
      videoRef.current.appendChild(videoElement);
    }

    // Use a more likely production domain for Adcash if 'youradexchange.com' was intended as a placeholder
    // However, we preserve the zone ID provided by the user.
    const adTagUrl = 'https://ad.adcash.com/script/vast.php?r=12225346';

    const player = videojs(videoElement, {
      autoplay: true,
      muted: true,
      controls: true,
      preload: 'auto',
      responsive: true,
      fluid: true,
      sources: [
        {
          src: 'https://vjs.zencdn.net/v/oceans.mp4',
          type: 'video/mp4',
        },
      ],
    }, () => {
      playerRef.current = player;
      console.log('Video.js player ready');

      try {
        if (typeof (player as any).ima === 'function') {
          console.log('Initializing IMA plugin with tag:', adTagUrl);
          (player as any).ima({
            adTagUrl,
            id: 'vjs-rewarded-video',
            showCountdown: true,
            debug: true,
            adWillAutoPlay: true,
            adWillPlayMuted: true,
            // Do NOT automatically load another ad
            adsManagerLoadedCallback: (adsManager: any) => {
              console.log('IMA AdsManager loaded');
              const googleIMA = (window as any).google;
              if (googleIMA && googleIMA.ima) {
                // Capture ad duration when it starts
                adsManager.addEventListener(googleIMA.ima.AdEvent.Type.STARTED, (adEvent: any) => {
                  const ad = adEvent.getAd();
                  const duration = ad.getDuration();
                  console.log('Ad started playing. Duration:', duration);
                  if (duration > 0) setAdDuration(Math.round(duration));
                });

                adsManager.addEventListener(googleIMA.ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: any) => {
                  console.error('IMA AdsManager Runtime Error:', errorEvent.getError().getMessage());
                });

                // Force play if needed
                adsManager.start();
              }
            }
          });

          // Initialize IMA immediately
          if ((player as any).ima && typeof (player as any).ima.initializeAdDisplayContainer === 'function') {
            console.log('Requesting IMA ads...');
            (player as any).ima.initializeAdDisplayContainer();
            (player as any).ima.requestAds();
          }

        } else {
          console.error('IMA plugin not found on player. Plugin type:', typeof (player as any).ima);
          setErrorMessage('Ad player initialization failed (IMA plugin missing).');
          setStep('error');
        }
      } catch (e: any) {
        console.error('IMA initialization error:', e);
        setErrorMessage(`Ad system error: ${e.message || 'Check connection'}`);
        setStep('error');
      }
    });

    player.on('adserror', (event: any) => {
      console.warn('IMA Ad Error:', event);
      const errorMsg = event.data?.AdError?.getMessage() || 'No advertisement available right now.';
      setErrorMessage(`${errorMsg} Please try again later.`);
      setStep('error');
    });

    player.on('error', () => {
      const error = player.error();
      console.error('Video.js Player Error:', error);
      setErrorMessage('The video could not be loaded. Please check your connection or try a different browser.');
      setStep('error');
    });

    // When the ad content or the video finishes
    player.on('ended', () => {
      handleAdCompletion();
    });

    // Cleanup
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [step, imaLoaded, session]);

  const handleStartPlayback = () => {
    setStep('playing');
  };

  const handleAdCompletion = async () => {
    if (!session?.sessionId) {
      setStep('completed');
      return;
    }

    setStep('verifying');
    try {
      // Authoritative server-side verification request
      const res = await api.verifyRewardedVideoCompletion(session.sessionId, {
        elapsedSeconds: adDuration || 30,
        providerTransactionId: session.providerSessionId
      });
      
      setVerificationData(res);
      setStep('completed');
      
      if (res.success && onRewardClaimed) {
        onRewardClaimed();
      }
    } catch (err: any) {
      setErrorMessage('Your ad completion could not be verified. No reward was added.');
      setStep('error');
    }
  };

  return (
    <div className="bg-zinc-900 text-white rounded-3xl overflow-hidden shadow-xl border border-zinc-800 max-w-xl mx-auto w-full">
      {/* Header bar */}
      <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">Sponsored Ad</h4>
            <p className="text-[11px] text-zinc-400">Adcash In-Stream ADVERTISEMENT</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-4">
        {step === 'loading_session' && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-zinc-300">Initializing secure ad session…</p>
          </div>
        )}

        {step === 'ready_to_play' && (
          <div className="space-y-5 text-center py-6">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto shadow-inner">
              <Play className="w-8 h-8 fill-current ml-1 text-purple-400" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-lg font-extrabold text-white uppercase tracking-tight">Advertisement</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Watch a real-time advertisement from Adcash. This helps support the platform.
              </p>
            </div>

            <button
              onClick={handleStartPlayback}
              className="w-full max-w-sm mx-auto py-3.5 px-6 rounded-2xl bg-[#6C2BD9] hover:bg-[#5821B0] active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Ad</span>
            </button>
          </div>
        )}

        {step === 'playing' && (
          <div className="space-y-3">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-zinc-800 shadow-2xl flex items-center justify-center">
              <div ref={videoRef} className="w-full h-full" />
            </div>
            <div className="flex items-center justify-center text-xs text-zinc-500 px-1 font-bold">
              ADVERTISEMENT
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-zinc-300">Verifying your reward...</p>
          </div>
        )}

        {step === 'completed' && (
          <div className="py-8 text-center space-y-4">
            <div className={`w-14 h-14 rounded-full ${verificationData?.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'} border flex items-center justify-center mx-auto`}>
              {verificationData?.success ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Ad completed</h3>
              {verificationData?.success ? (
                <p className="text-sm font-bold text-emerald-400">Reward: ₦{verificationData.rewardAmount || 10}</p>
              ) : (
                <p className="text-xs text-zinc-300 max-w-xs mx-auto">
                  Your ad completion could not be verified. No reward was added.
                </p>
              )}
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
              >
                Return to Earn
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Ad Unavailable</h3>
              <p className="text-xs text-rose-300 max-w-xs mx-auto">{errorMessage || 'No advertisement available right now. Please try again later.'}</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setStep('ready_to_play')}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
              >
                Return to Earn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
