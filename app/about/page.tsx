"use client";

import { Phone, Users, ShieldCheck, Mail } from "lucide-react"; // 👈 Added Mail icon
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto mt-10">
      <div className="bg-white rounded-lg shadow border p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Namma Trust</h1>
          <p className="text-gray-600 font-medium">Together | We Care | We Grow</p>
        </div>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              About Us
            </h2>
            <p>
              Namma Trust is a community-driven financial platform designed to help members pool their resources, 
              access fair loans, and earn monthly profits. We believe in financial transparency and empowering 
              our community to grow together.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Contact Details
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              
              {/* Email Address */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:nammatrust10@gmail.com" className="text-blue-600 hover:underline">nammatrust10@gmail.com</a>
                </div>
              </div>

              <div className="h-px w-full bg-gray-200 my-2"></div>

              {/* Phone Numbers */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-semibold">Bhagyavanta</p>
                  <a href="tel:+918105757620" className="text-blue-600 hover:underline">+91 81057 57620</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-semibold">Punit Prithviraj</p>
                  <a href="tel:+918970089722" className="text-blue-600 hover:underline">+91 89700 89722</a>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <Link href="/investor-portal" className="text-blue-600 font-medium hover:underline">
            &larr; Back to My Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
