import React, { useState, useEffect } from "react";
import { Rating } from "@/entities/Rating";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Send, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Ratings() {
  const [ratings, setRatings] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const allRatings = await Rating.filter({ visible: true }, "-created_date", 50);
      setRatings(allRatings);

      const userRating = allRatings.find(r => r.user_id === currentUser.id);
      if (userRating) {
        setExistingRating(userRating);
        setMyRating(userRating.rating);
        setMyReview(userRating.review || "");
      }
    } catch (error) {
      const allRatings = await Rating.filter({ visible: true }, "-created_date", 50);
      setRatings(allRatings);
    }
    setLoading(false);
  };

  const submitRating = async () => {
    if (!user || myRating === 0) return;

    setSubmitting(true);
    try {
      const ratingData = {
        user_id: user.id,
        user_name: user.full_name,
        user_ign: user.ign || user.full_name,
        user_avatar: user.avatar_url,
        rating: myRating,
        review: myReview.trim(),
        visible: true
      };

      if (existingRating) {
        await Rating.update(existingRating.id, ratingData);
      } else {
        await Rating.create(ratingData);
      }

      await loadData();
      alert("Thank you for your rating!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating. Please try again.");
    }
    setSubmitting(false);
  };

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) 
    : 0;

  const renderStars = (rating, interactive = false, size = "w-5 h-5") => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} cursor-${interactive ? 'pointer' : 'default'} transition-all ${
              star <= (interactive ? (hoverRating || myRating) : rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
            onClick={() => interactive && setMyRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-800 rounded w-48"></div>
            <div className="h-48 bg-gray-800 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center gap-3">
            <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
            App Ratings & Reviews
          </h1>
          <p className="text-gray-400 mt-1">Share your experience with Battle Hub</p>
        </motion.div>

        {/* Average Rating Card */}
        <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-6xl font-black text-yellow-400 mb-2">{averageRating}</div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(parseFloat(averageRating)))}
            </div>
            <p className="text-gray-400">{ratings.length} reviews</p>
          </CardContent>
        </Card>

        {/* Submit Rating */}
        {user ? (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-400" />
                {existingRating ? 'Update Your Rating' : 'Rate Battle Hub'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-400 text-sm">Tap to rate</p>
                {renderStars(myRating, true, "w-10 h-10")}
              </div>

              <Textarea
                value={myReview}
                onChange={(e) => setMyReview(e.target.value)}
                placeholder="Write your review (optional)..."
                className="bg-gray-800 border-gray-700 text-gray-100 min-h-[100px]"
              />

              <Button
                onClick={submitRating}
                disabled={myRating === 0 || submitting}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">Please login to submit a rating</p>
            </CardContent>
          </Card>
        )}

        {/* All Reviews */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100">All Reviews</h2>
          
          {ratings.length === 0 ? (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500">No reviews yet. Be the first to rate!</p>
              </CardContent>
            </Card>
          ) : (
            ratings.map((rating, index) => (
              <motion.div
                key={rating.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12 ring-2 ring-yellow-500/30">
                        <AvatarImage src={rating.user_avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                          {rating.user_ign?.[0] || rating.user_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-100">
                            {rating.user_ign || rating.user_name || 'Player'}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {format(new Date(rating.created_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="mb-2">
                          {renderStars(rating.rating)}
                        </div>
                        {rating.review && (
                          <p className="text-gray-300 text-sm">{rating.review}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}