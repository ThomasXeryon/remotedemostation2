import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-500 fill-current" />
            <span className="text-xl font-bold text-gray-900">LoveCreator</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <button className="text-gray-700 hover:text-pink-600 font-medium">
                  For Creators
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <Link href="/for-creators" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Overview
                    </Link>
                    <Link href="/start-creating" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Start Creating
                    </Link>
                    <Link href="/creator-resources" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Creator Resources
                    </Link>
                    <Link href="/success-stories" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Success Stories
                    </Link>
                    <Link href="/creator-guidelines" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Creator Guidelines
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button className="text-gray-700 hover:text-pink-600 font-medium">
                  For Patrons
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <Link href="/browse-creators" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Browse Creators
                    </Link>
                    <Link href="/how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      How it Works
                    </Link>
                    <Link href="/gift-memberships" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Gift Memberships
                    </Link>
                    <Link href="/mobile-app" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">
                      Mobile App
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/help-center" className="text-gray-700 hover:text-pink-600 font-medium">
                Support
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-gray-700 hover:text-pink-600">
                Log in
              </Button>
              <Button className="bg-pink-600 hover:bg-pink-700 text-white">
                Sign up
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              <Link href="/for-creators" className="block px-3 py-2 text-gray-700 hover:text-pink-600">
                For Creators
              </Link>
              <Link href="/browse-creators" className="block px-3 py-2 text-gray-700 hover:text-pink-600">
                Browse Creators
              </Link>
              <Link href="/how-it-works" className="block px-3 py-2 text-gray-700 hover:text-pink-600">
                How it Works
              </Link>
              <Link href="/help-center" className="block px-3 py-2 text-gray-700 hover:text-pink-600">
                Support
              </Link>
              <div className="flex flex-col space-y-2 px-3 pt-4">
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                  Sign up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}