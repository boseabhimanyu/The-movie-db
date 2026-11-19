package router

import (
	"movie-app/handler"

	"github.com/gin-gonic/gin"
)

func RegisterReviewRoutes(
	api *gin.RouterGroup,
	reviewHandler *handler.ReviewHandler,
	authMiddleware gin.HandlerFunc,
	optionalAuthMiddleware gin.HandlerFunc,
) {

	// Public review feeds (optionalAuthMiddleware enriches response with myReview, isOwner, and isHelpful)
	api.GET("/movies/:id/reviews", optionalAuthMiddleware, reviewHandler.GetMovieReviews)
	api.GET("/shows/:id/reviews", optionalAuthMiddleware, reviewHandler.GetShowReviews)
	// api.GET("/users/:userId/reviews", optionalAuthMiddleware, reviewHandler.GetUserReviews)

	// Authenticated review actions
	protected := api.Group("", authMiddleware)
	{
		protected.PUT("/movies/:id/reviews", reviewHandler.UpsertMovieReview)
		protected.PUT("/shows/:id/reviews", reviewHandler.UpsertShowReview)
		protected.GET("/me/reviews", reviewHandler.GetMyReviews)
		protected.POST("/reviews/:reviewId/helpful", reviewHandler.ToggleHelpful)
		protected.DELETE("/reviews/:reviewId", reviewHandler.DeleteReview)
	}
}
