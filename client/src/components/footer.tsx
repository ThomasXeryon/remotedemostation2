import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Heart className="h-8 w-8 text-pink-500 fill-current" />
              <span className="text-xl font-bold">LoveCreator</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Empowering creators and connecting them with passionate supporters worldwide.
            </p>
          </div>

          {/* For Creators */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Creators</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/start-creating" className="text-gray-400 hover:text-white transition-colors">
                  Start Creating
                </Link>
              </li>
              <li>
                <Link href="/creator-resources" className="text-gray-400 hover:text-white transition-colors">
                  Creator Resources
                </Link>
              </li>
              <li>
                <Link href="/success-stories" className="text-gray-400 hover:text-white transition-colors">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="/creator-guidelines" className="text-gray-400 hover:text-white transition-colors">
                  Creator Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* For Patrons */}
          <div>
            <h3 className="text-lg font-semibold mb-4">For Patrons</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/browse-creators" className="text-gray-400 hover:text-white transition-colors">
                  Browse Creators
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/gift-memberships" className="text-gray-400 hover:text-white transition-colors">
                  Gift Memberships
                </Link>
              </li>
              <li>
                <Link href="/mobile-app" className="text-gray-400 hover:text-white transition-colors">
                  Mobile App
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help-center" className="text-gray-400 hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="text-gray-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 LoveCreator. Made with <Heart className="inline h-4 w-4 text-pink-500 fill-current mx-1" /> for creators worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}