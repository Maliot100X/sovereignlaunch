'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { bagsApi } from '@/lib/bags-api';
import { Rocket, Image, Twitter, Globe, MessageCircle, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import type { TokenLaunchParams } from '@/types';

const LAUNCH_TYPES = [
  { value: 'gasless', label: 'Gasless Launch (Recommended)', description: 'We pay the gas fees. Platform fee: 25%' },
  { value: 'self-funded', label: 'Self-Funded Launch', description: 'You pay gas upfront. Lower platform fee: 15%' },
];

const FEE_BREAKDOWN = {
  platform: 25,
  user: 70,
  partner: 5,
};

export function TokenLaunchForm() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<TokenLaunchParams>>({
    name: '',
    symbol: '',
    description: '',
    launchType: 'gasless',
    decimals: 9,
    totalSupply: '1000000000',
    initialLiquidity: '1',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; tokenAddress?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunch = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.symbol) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = formData.image;
      if (imageFile) {
        const uploadResponse = await bagsApi.uploadImage(imageFile);
        if (uploadResponse.success) {
          imageUrl = uploadResponse.data?.url;
        }
      }

      const launchParams: TokenLaunchParams = {
        name: formData.name!,
        symbol: formData.symbol!.toUpperCase(),
        description: formData.description || '',
        image: imageUrl,
        launchType: formData.launchType as 'gasless' | 'self-funded',
        decimals: formData.decimals || 9,
        totalSupply: formData.totalSupply || '1000000000',
        initialLiquidity: formData.initialLiquidity || '1',
        creatorWallet: publicKey.toString(),
        socialLinks: {
          twitter: formData.socialLinks?.twitter,
          telegram: formData.socialLinks?.telegram,
          website: formData.socialLinks?.website,
        },
      };

      const response = await bagsApi.launchToken(launchParams);

      if (response.success && response.tokenAddress) {
        setResult({
          success: true,
          message: 'Token launched successfully!',
          tokenAddress: response.tokenAddress,
        });
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to launch token',
        });
      }
    } catch (error) {
      console.error('Launch error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center">
          {result.success ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Token Launched!</h3>
              <p className="text-gray-400 mb-6">{result.message}</p>
              {result.tokenAddress && (
                <div className="bg-[#12121a] rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-2">Token Address</p>
                  <code className="text-sm text-[#ffd700] break-all">{result.tokenAddress}</code>
                </div>
              )}
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Launch Failed</h3>
              <p className="text-red-400 mb-6">{result.message}</p>
            </>
          )}
          <Button onClick={() => {
            setResult(null);
            setStep(1);
            setFormData({
              name: '',
              symbol: '',
              description: '',
              launchType: 'gasless',
              decimals: 9,
              totalSupply: '1000000000',
              initialLiquidity: '1',
            });
            setImagePreview(null);
            setImageFile(null);
          }}>
            Launch Another Token
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[#ffd700]" />
          Launch Your Token
        </CardTitle>
        <CardDescription>
          Create and launch your token on Solana in minutes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!connected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Connect your wallet to launch a token</p>
            <WalletMultiButton className="wallet-adapter-button" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., My Awesome Token"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Symbol *
                  </label>
                  <Input
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., MAT"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your token..."
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Image
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2a2a3a] rounded-lg p-6 text-center cursor-pointer hover:border-[#ffd700]/50 transition-colors"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click to upload image (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <Button onClick={() => setStep(2)} className="w-full">
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Launch Type *
                  </label>
                  <Select
                    name="launchType"
                    value={formData.launchType}
                    onChange={handleInputChange}
                    className="w-full"
                  >
                    {LAUNCH_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {LAUNCH_TYPES.find(t => t.value === formData.launchType)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Decimals
                    </label>
                    <Select
                      name="decimals"
                      value={formData.decimals?.toString()}
                      onChange={handleInputChange}
                    >
                      <option value="6">6</option>
                      <option value="9">9 (Recommended)</option>
                      <option value="18">18</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Supply
                    </label>
                    <Input
                      name="totalSupply"
                      value={formData.totalSupply}
                      onChange={handleInputChange}
                      placeholder="1000000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Liquidity (SOL)
                  </label>
                  <Input
                    name="initialLiquidity"
                    value={formData.initialLiquidity}
                    onChange={handleInputChange}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Social Links (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Twitter className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Twitter URL"
                      value={formData.socialLinks?.twitter || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Telegram URL"
                      value={formData.socialLinks?.telegram || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, telegram: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Website URL"
                      value={formData.socialLinks?.website || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, website: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="bg-[#12121a] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Fee Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Platform Fee ({FEE_BREAKDOWN.platform}%)</span>
                      <span className="text-[#ffd700]">{(parseFloat(formData.initialLiquidity || '0') * FEE_BREAKDOWN.platform / 100).toFixed(3)} SOL</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Creator Earnings ({FEE_BREAKDOWN.user}%)</span>
                      <span className="text-green-400">{(parseFloat(formData.initialLiquidity || '0') * FEE_BREAKDOWN.user / 100).toFixed(3)} SOL</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Partner Fee ({FEE_BREAKDOWN.partner}%)</span>
                      <span>{(parseFloat(formData.initialLiquidity || '0') * FEE_BREAKDOWN.partner / 100).toFixed(3)} SOL</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleLaunch} isLoading={isLoading} className="flex-1">
                    Launch Token
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TokenLaunchForm;
